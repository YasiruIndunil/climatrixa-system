"""
Alert Service
─────────────
Called every time a new reading is stored.
Checks the reading against all active alert rules for that sensor.
If a threshold is exceeded, logs an alert_event to Supabase.
"""
from app.core.database import db


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
            unit = UNIT_MAP.get(field, "")
            direction_word = "exceeded" if direction == "gt" else "dropped below"
            message = (
                f"{field.capitalize()} {direction_word} threshold: "
                f"{actual:.1f}{unit} (limit: {threshold:.1f}{unit})"
            )

            # Log the alert event
            db.table("alert_events").insert({
                "sensor_id":       sensor_id,
                "alert_type":      alert_type,
                "actual_value":    actual,
                "threshold_value": threshold,
                "message":         message,
            }).execute()

            # TODO: Add email notification here using SendGrid or Resend (both free tier)
            # await send_alert_email(rule["notify_email"], message)


def get_alert_events(sensor_id: str = None, limit: int = 50) -> list:
    """Fetch recent alert events, optionally filtered by sensor."""
    query = db.table("alert_events").select("*").order("triggered_at", desc=True).limit(limit)
    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    return query.execute().data
