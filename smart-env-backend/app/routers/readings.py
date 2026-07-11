from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from typing import List, Optional
import json
from datetime import datetime, timedelta, timezone
from app.models.schemas import ReadingCreate, ReadingResponse, LatestReadingsResponse
from app.core.database import db
from app.core.security import require_admin, get_current_user
from app.services.alert_service import check_and_trigger_alerts
from app.core.timezone import utc_to_slst, format_slst
from fastapi.responses import StreamingResponse, Response
from io import StringIO, BytesIO
import csv

router = APIRouter(prefix="/readings", tags=["Readings"])

from app.core.ws_manager import manager

SLST_OFFSET = timedelta(hours=5, minutes=30)


def _to_slst(dt_raw) -> str:
    """
    Convert UTC datetime to SLST in Excel/Google Sheets-recognized format
    (YYYY-MM-DD HH:MM:SS, 24h) so it's treated as a real date/time value —
    enabling sort and date-filter in spreadsheet tools. Not for UI display.
    """
    if not dt_raw:
        return ""
    try:
        dt_str = str(dt_raw).replace(" ", "T").replace("+00", "+00:00").replace("+00:00:00", "+00:00")
        dt = datetime.fromisoformat(dt_str)
        slst_dt = dt + timedelta(hours=5, minutes=30)
        return slst_dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt_raw)


def _slst_to_utc(date_str: str, end_of_day: bool = False) -> str:
    """Convert a SLST date string (YYYY-MM-DD) to UTC datetime string for DB filtering."""
    time_part = "23:59:59" if end_of_day else "00:00:00"
    slst_dt = datetime.strptime(f"{date_str} {time_part}", "%Y-%m-%d %H:%M:%S")
    slst_dt = slst_dt.replace(tzinfo=timezone(SLST_OFFSET))
    utc_dt = slst_dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


@router.post("/", response_model=ReadingResponse, status_code=201)
async def store_reading(body: ReadingCreate):
    sensor = (
        db.table("sensors")
        .select("id, is_active")
        .eq("id", body.sensor_id)
        .eq("api_key", body.api_key)
        .execute()
    )
    if not sensor.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid sensor_id or api_key")
    if not sensor.data[0]["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sensor is inactive")

    insert_data = {
        "sensor_id": body.sensor_id,
        "temperature": body.temperature,
        "humidity": body.humidity,
        "aqi": body.aqi,
        "pressure": body.pressure,
    }
    if body.recorded_at:
        insert_data["recorded_at"] = body.recorded_at

    result = db.table("readings").insert(insert_data).execute()
    reading = result.data[0]

    await manager.broadcast({"event": "new_reading", "data": reading})
    await check_and_trigger_alerts(body.sensor_id, reading)

    recorded_utc = datetime.fromisoformat(reading["recorded_at"].replace("Z", "+00:00"))
    return {
        **reading,
        "recorded_at_local":   utc_to_slst(recorded_utc),
        "recorded_at_display": format_slst(recorded_utc),
    }


@router.get("/latest", response_model=List[LatestReadingsResponse])
async def latest_readings():
    sensors = db.table("sensors").select("*").eq("is_active", True).execute()
    results = []
    for sensor in sensors.data:
        latest = (
            db.table("readings")
            .select("*")
            .eq("sensor_id", sensor["id"])
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest.data:
            r = latest.data[0]
            recorded_utc = datetime.fromisoformat(r["recorded_at"].replace("Z", "+00:00"))
            results.append({
                **r,
                "sensor_name":         sensor["name"],
                "location":            sensor["location"],
                "aqi_status":          _aqi_label(r["aqi"]),
                "recorded_at_local":   utc_to_slst(recorded_utc),
                "recorded_at_display": format_slst(recorded_utc),
            })
    return results


def _aqi_label(aqi: float) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for sensitive groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


@router.websocket("/ws/live")
async def live_readings_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/export")
async def export_readings(
    sensor_id: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    format: str = "csv",
    current_user: dict = Depends(get_current_user)
):
    allowed_sensor_ids = None
    if current_user.get("role") != "admin":
        access = (
            db.table("user_sensor_access")
            .select("sensor_id")
            .eq("user_id", current_user.get("sub"))
            .execute()
        )
        allowed_sensor_ids = [row["sensor_id"] for row in (access.data or [])]
        if sensor_id and sensor_id not in allowed_sensor_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this sensor"
            )

    def build_query():
        """Build a fresh query with filters — must rebuild each page since
        the Supabase client can't safely reuse a builder after execute()."""
        q = db.table("readings").select("*")
        if sensor_id:
            q = q.eq("sensor_id", sensor_id)
        elif allowed_sensor_ids is not None:
            q = q.in_("sensor_id", allowed_sensor_ids)
        if from_:
            q = q.gte("recorded_at", _slst_to_utc(from_, end_of_day=False))
        if to:
            q = q.lte("recorded_at", _slst_to_utc(to, end_of_day=True))
        return q

    # Paginate to fetch all records beyond Supabase's 1000 default limit
    all_rows = []
    if allowed_sensor_ids is None or allowed_sensor_ids or sensor_id:
        page = 0
        page_size = 1000
        while True:
            result = (
                build_query()
                .order("recorded_at", desc=False)
                .range(page * page_size, (page + 1) * page_size - 1)
                .execute()
            )
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
               "temperature", "humidity", "aqi", "pressure", "recorded_at (SLST)"]

    def row_data(r):
        s = sensor_map.get(r.get("sensor_id"), {})
        return [
            s.get("name", ""),
            s.get("location", ""),
            s.get("latitude", ""),
            s.get("longitude", ""),
            s.get("industry_profile", ""),
            r.get("temperature", ""),
            r.get("humidity", ""),
            r.get("aqi", ""),
            r.get("pressure", ""),
            _to_slst(r.get("recorded_at", "")),
        ]

    if format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=18, rightMargin=18, topMargin=24, bottomMargin=18,
        )
        styles = getSampleStyleSheet()
        elements = [Paragraph("Climatrixa — Sensor Readings Report", styles["Title"]), Spacer(1, 12)]
        data = [headers] + [row_data(r) for r in rows]
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.teal),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        elements.append(table)
        doc.build(elements)
        buf.seek(0)
        return Response(content=buf.read(), media_type="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=readings.pdf"})

    # CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(row_data(r))
    output.seek(0)
    # Prepend UTF-8 BOM so Excel and other tools render special characters (°, etc.) correctly
    csv_bytes = "\ufeff" + output.getvalue()
    return StreamingResponse(iter([csv_bytes]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": "attachment; filename=readings.csv"})