"""
Alert Service
─────────────
Called every time a new reading is stored.
Checks the reading against all active alert rules for that sensor.
If a threshold is exceeded, logs an alert_event to Supabase.
"""
from datetime import datetime, timedelta, timezone
from app.core.database import db
from app.core.ws_manager import manager

# How long an unacknowledged alert blocks re-firing before it's treated as
# "still open, remind everyone again" rather than a duplicate.
REALERT_COOLDOWN = timedelta(minutes=1)

# What field of the reading does each alert_type check?
ALERT_FIELD_MAP = {
    "temperature_high": ("temperature", "gt"),
    "temperature_low":  ("temperature", "lt"),
    "humidity_high":    ("humidity",    "gt"),
    "humidity_low":     ("humidity",    "lt"),
    "aqi_high":         ("aqi",         "gt"),
}

UNIT_MAP = {
    "temperature": "\u00b0C",
    "humidity": "%",
    "aqi": " AQI",
}


async def check_and_trigger_alerts(sensor_id: str, reading: dict):
    """
    Check a new reading against all alert rules for this sensor.
    Only checks rules where trigger_on_actual=True (predictive alerts
    are handled separately in predictive_alerts.py via the AI forecast).
    Logs an alert_event for every rule that is breached.
    """
    print(f"[Alert] Checking rules for sensor {sensor_id[:8]}...")

    rules = (
        db.table("alert_rules")
        .select("*")
        .eq("sensor_id", sensor_id)
        .eq("is_active", True)
        .eq("trigger_on_actual", True)
        .execute()
    )

    if not rules.data:
        print(f"[Alert] No active rules for sensor {sensor_id[:8]}")
        return

    print(f"[Alert] Found {len(rules.data)} active rule(s)")

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

        print(f"[Alert] Rule: {alert_type} threshold={threshold} actual={actual} triggered={triggered}")

        if triggered:
            # Re-trigger if the last ACTUAL alert was acknowledged, OR it's
            # still unacknowledged but older than REALERT_COOLDOWN — the
            # condition is still breached, so remind everyone again instead
            # of staying silent forever until someone clicks Acknowledge.
            # (is_predicted=False filter prevents an unacknowledged AI-predicted
            #  alert from silently blocking a real actual-reading alert)
            cooldown_cutoff = (datetime.now(timezone.utc) - REALERT_COOLDOWN).isoformat()
            recent_unacknowledged = (
                db.table("alert_events")
                .select("id")
                .eq("sensor_id", sensor_id)
                .eq("alert_type", alert_type)
                .eq("acknowledged", False)
                .eq("is_predicted", False)
                .gte("triggered_at", cooldown_cutoff)
                .execute()
            )
            if recent_unacknowledged.data:
                print(f"[Alert] Skipping — unacknowledged alert already exists within cooldown")
                continue

            # Build message
            unit = UNIT_MAP.get(field, "")
            direction_word = "exceeded" if direction == "gt" else "dropped below"
            message = (
                f"{field.capitalize()} {direction_word} threshold: "
                f"{actual:.1f}{unit} (limit: {threshold:.1f}{unit})"
            )

            print(f"[Alert] TRIGGERED: {message}")

            # Log the alert event
            result = db.table("alert_events").insert({
                "sensor_id":       sensor_id,
                "alert_type":      alert_type,
                "actual_value":    actual,
                "threshold_value": threshold,
                "message":         message,
                "is_predicted":    False,
            }).execute()

            # Broadcast to all connected WebSocket clients
            if result.data:
                try:
                    await manager.broadcast({
                        "event": "alert_triggered",
                        "data": result.data[0]
                    })
                    print(f"[Alert] Broadcast sent to WebSocket clients")
                except Exception as e:
                    print(f"[Alert] Broadcast failed: {e}")


def get_alert_events(sensor_id: str = None, limit: int = 50) -> list:
    """Fetch recent alert events, optionally filtered by sensor."""
    query = (
        db.table("alert_events")
        .select("*")
        .order("triggered_at", desc=True)
        .limit(limit)
    )
    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    return query.execute().data