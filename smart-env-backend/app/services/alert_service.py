"""
Alert Service
─────────────
Called every time a new reading is stored.
Checks the reading against all active alert rules for that sensor.
If a threshold is exceeded, logs an alert_event to Supabase.
"""
from app.core.database import db
from app.routers.readings import manager


# What field of the reading does each alert_type check?
ALERT_FIELD_MAP = {
    "temperature_high": ("temperature", "gt"),
    "temperature_low":  ("temperature", "lt"),
    "humidity_high":    ("humidity",    "gt"),
    "humidity_low":     ("humidity",    "lt"),
    "aqi_high":         ("aqi",         "gt"),
}

UNIT_MAP = {
    "temperature": "°C",
    "humidity": "%",
    "aqi": " AQI",
}


async def check_and_trigger_alerts(sensor_id: str, reading: dict):
    """
    Check a new reading against all alert rules for this sensor.
    Logs an alert_event for every rule that is breached.
    """
    rules = (
        db.table("alert_rules")
        .select("*")
        .eq("sensor_id", sensor_id)
        .eq("is_active", True)
        .execute()
    )

    if not rules.data:
        return  # No rules configured for this sensor

    for rule in rules.data:
        alert_type = rule["alert_type"]
        threshold  = rule["threshold_value"]

        if alert_type not in ALERT_FIELD_MAP:
            continue

        field, direction = ALERT_FIELD_MAP[alert_type]
        actual = reading.get(field)

        if actual is None:
            continue

        triggered = (
            (direction == "gt" and actual > threshold) or
            (direction == "lt" and actual < threshold)
        )

        if triggered:
            # Only re-trigger if last alert was acknowledged
            # Prevents flooding while ensuring admin sees every alert
            recent_unacknowledged = (
                db.table("alert_events")
                .select("id")
                .eq("sensor_id", sensor_id)
                .eq("alert_type", alert_type)
                .eq("acknowledged", False)
                .execute()
            )
            if recent_unacknowledged.data:
                continue  # Unacknowledged alert exists — don't create another

           # Log the alert event
            result = db.table("alert_events").insert({
                "sensor_id":       sensor_id,
                "alert_type":      alert_type,
                "actual_value":    actual,
                "threshold_value": threshold,
                "message":         message,
            }).execute()

            # Broadcast to all connected WebSocket clients (React dashboard)
            if result.data:
                import asyncio
                try:
                    await manager.broadcast({
                        "event": "alert_triggered",
                        "data": result.data[0]
                    })
                except Exception:
                    pass

            # TODO: Add email notification here using SendGrid or Resend (both free tier)
            # await send_alert_email(rule["notify_email"], message)


def get_alert_events(sensor_id: str = None, limit: int = 50) -> list:
    """Fetch recent alert events, optionally filtered by sensor."""
    query = db.table("alert_events").select("*").order("triggered_at", desc=True).limit(limit)
    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    return query.execute().data
