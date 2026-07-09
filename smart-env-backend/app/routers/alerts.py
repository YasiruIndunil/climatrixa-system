from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from typing import List, Optional
from io import StringIO
import csv
from app.models.schemas import AlertRuleCreate, AlertRuleResponse, AlertEventResponse
from app.core.security import require_admin
from app.core.database import db
from app.services.alert_service import get_alert_events

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/rules", response_model=List[AlertRuleResponse])
async def list_alert_rules(admin: dict = Depends(require_admin)):
    """List all alert rules. Admin only."""
    result = db.table("alert_rules").select("*").execute()
    return result.data


@router.post("/rules", response_model=AlertRuleResponse, status_code=201)
async def create_alert_rule(
    body: AlertRuleCreate,
    admin: dict = Depends(require_admin)
):
    """
    Create an alert rule for a sensor. Admin only.

    Example — alert when temperature goes above 35°C:
    {
        "sensor_id": "uuid",
        "alert_type": "temperature_high",
        "threshold_value": 35.0,
        "notify_email": "manager@factory.com"
    }
    """
    sensor = db.table("sensors").select("id").eq("id", body.sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    result = db.table("alert_rules").insert({
        "sensor_id":       body.sensor_id,
        "alert_type":      body.alert_type.value,
        "threshold_value": body.threshold_value,
        "notify_email":    body.notify_email,
    }).execute()

    return result.data[0]


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_alert_rule(rule_id: str, admin: dict = Depends(require_admin)):
    """Delete an alert rule. Admin only."""
    db.table("alert_rules").delete().eq("id", rule_id).execute()
    return None


@router.get("/events")
async def list_alert_events(sensor_id: str = None, limit: int = 50):
    """
    Get recent alert events (triggered alerts log).
    Optional: ?sensor_id=uuid to filter by sensor.
    Public endpoint — admins and public users can view.
    """
    return get_alert_events(sensor_id=sensor_id, limit=limit)


@router.patch("/events/{event_id}/acknowledge")
async def acknowledge_alert(
    event_id: str,
    current_user: dict = Depends(require_admin)
):
    """Admin acknowledges an alert event."""
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
        query = query.gte("triggered_at", from_)
    if to:
        query = query.lte("triggered_at", to)
    result = query.order("triggered_at", desc=True).execute()
    rows = result.data or []

    if format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
        from io import BytesIO
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        data = [["Sensor ID", "Alert Type", "Actual Value", "Threshold", "Message", "Triggered At", "Acknowledged"]]
        for r in rows:
            data.append([r.get("sensor_id",""), r.get("alert_type",""), r.get("actual_value",""), r.get("threshold_value",""), r.get("message",""), r.get("triggered_at",""), r.get("acknowledged","")])
        table = Table(data)
        table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.orange),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.5,colors.grey)]))
        doc.build([table])
        buf.seek(0)
        return Response(content=buf.read(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=alert_events.pdf"})

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["sensor_id","alert_type","actual_value","threshold_value","message","triggered_at","acknowledged"])
    for r in rows:
        writer.writerow([r.get("sensor_id"), r.get("alert_type"), r.get("actual_value"), r.get("threshold_value"), r.get("message"), r.get("triggered_at"), r.get("acknowledged")])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=alert_events.csv"})