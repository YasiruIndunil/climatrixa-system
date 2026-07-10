from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from typing import List, Optional
from io import StringIO, BytesIO
from datetime import datetime, timedelta, timezone
import csv
from app.models.schemas import AlertRuleCreate, AlertRuleResponse, AlertEventResponse
from app.core.security import require_admin
from app.core.database import db
from app.core.timezone import format_slst
from app.services.alert_service import get_alert_events

router = APIRouter(prefix="/alerts", tags=["Alerts"])

SLST_OFFSET = timedelta(hours=5, minutes=30)


def _to_slst(dt_raw) -> str:
    if not dt_raw:
        return ""
    try:
        dt_str = str(dt_raw).replace(" ", "T").replace("+00", "+00:00").replace("+00:00:00", "+00:00")
        dt = datetime.fromisoformat(dt_str)
        return format_slst(dt)
    except Exception:
        return str(dt_raw)


def _slst_to_utc(date_str: str, end_of_day: bool = False) -> str:
    """Convert a SLST date string (YYYY-MM-DD) to UTC datetime string for DB filtering."""
    time_part = "23:59:59" if end_of_day else "00:00:00"
    slst_dt = datetime.strptime(f"{date_str} {time_part}", "%Y-%m-%d %H:%M:%S")
    slst_dt = slst_dt.replace(tzinfo=timezone(SLST_OFFSET))
    utc_dt = slst_dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


@router.get("/rules", response_model=List[AlertRuleResponse])
async def list_alert_rules(admin: dict = Depends(require_admin)):
    result = db.table("alert_rules").select("*").execute()
    return result.data


@router.post("/rules", response_model=AlertRuleResponse, status_code=201)
async def create_alert_rule(body: AlertRuleCreate, admin: dict = Depends(require_admin)):
    sensor = db.table("sensors").select("id").eq("id", body.sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")
    result = db.table("alert_rules").insert({
        "sensor_id":            body.sensor_id,
        "alert_type":           body.alert_type.value,
        "threshold_value":      body.threshold_value,
        "notify_email":         body.notify_email,
        "trigger_on_actual":    body.trigger_on_actual,
        "trigger_on_predicted": body.trigger_on_predicted,
    }).execute()
    return result.data[0]


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_alert_rule(rule_id: str, admin: dict = Depends(require_admin)):
    db.table("alert_rules").delete().eq("id", rule_id).execute()
    return None


@router.get("/events")
async def list_alert_events(sensor_id: str = None, limit: int = 50):
    return get_alert_events(sensor_id=sensor_id, limit=limit)


@router.patch("/events/{event_id}/acknowledge")
async def acknowledge_alert(event_id: str, current_user: dict = Depends(require_admin)):
    result = db.table("alert_events").update({
        "acknowledged": True,
        "acknowledged_at": "NOW()",
        "acknowledged_by": current_user.get("sub")
    }).eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert event not found")
    return result.data[0]


@router.get("/events/export")
async def export_alert_events(
    sensor_id: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    format: str = "csv",
    admin: dict = Depends(require_admin)
):
    query = db.table("alert_events").select("*")
    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    if from_:
        query = query.gte("triggered_at", _slst_to_utc(from_, end_of_day=False))
    if to:
        query = query.lte("triggered_at", _slst_to_utc(to, end_of_day=True))

    # Paginate to fetch all records beyond Supabase's 1000 default limit
    all_rows = []
    page = 0
    page_size = 1000
    while True:
        result = query.order("triggered_at", desc=True).range(page * page_size, (page + 1) * page_size - 1).execute()
        if not result.data:
            break
        all_rows.extend(result.data)
        if len(result.data) < page_size:
            break
        page += 1
    rows = all_rows

    # Fetch sensor info map
    sensors_result = db.table("sensors").select("id, name, location, latitude, longitude, industry_profile").execute()
    sensor_map = {s["id"]: s for s in (sensors_result.data or [])}

    headers = ["sensor_name", "location", "latitude", "longitude", "industry_profile",
               "alert_type", "actual_value", "threshold_value", "message",
               "triggered_at (SLST)", "acknowledged"]

    def row_data(r):
        s = sensor_map.get(r.get("sensor_id"), {})
        return [
            s.get("name", ""),
            s.get("location", ""),
            s.get("latitude", ""),
            s.get("longitude", ""),
            s.get("industry_profile", ""),
            r.get("alert_type", ""),
            r.get("actual_value", ""),
            r.get("threshold_value", ""),
            r.get("message", ""),
            _to_slst(r.get("triggered_at", "")),
            r.get("acknowledged", ""),
        ]

    if format == "pdf":
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
        styles = getSampleStyleSheet()
        elements = [Paragraph("Climatrixa — Alert Events Report", styles["Title"]), Spacer(1, 12)]
        data = [headers] + [row_data(r) for r in rows]
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.orange),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        elements.append(table)
        doc.build(elements)
        buf.seek(0)
        return Response(content=buf.read(), media_type="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=alert_events.pdf"})

    # CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(row_data(r))
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=alert_events.csv"})
