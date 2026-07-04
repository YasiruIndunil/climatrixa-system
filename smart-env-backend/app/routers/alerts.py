from fastapi import APIRouter, Depends, HTTPException
from typing import List
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


