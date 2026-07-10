"""
Predictive Alert Service — Climatrixa
───────────────────────────────────────
Checks AI forecast values against alert rules that have trigger_on_predicted=True.
If a predicted value crosses the threshold within the forecast window, creates
a distinct "predicted" alert event (separate from actual-reading-triggered alerts).

Deduplication: only one active (unacknowledged) predicted alert per rule at a time.
"""
from datetime import datetime, timezone
from app.core.database import db


def _breaches_threshold(alert_type: str, value: float, threshold: float) -> bool:
    if alert_type.endswith("_high"):
        return value > threshold
    if alert_type.endswith("_low"):
        return value < threshold
    return False


def _param_for_alert_type(alert_type: str) -> str:
    # e.g. "temperature_high" -> "temperature"
    for param in ["temperature", "humidity", "aqi", "pressure"]:
        if alert_type.startswith(param):
            return param
    return None


def check_predicted_alerts(sensor_id: str, forecast: list[dict]):
    """
    Check forecast points against active alert rules with trigger_on_predicted=True.
    Creates an alert_event (is_predicted=True) if a breach is found and no
    unacknowledged predicted alert already exists for that rule.
    """
    try:
        rules = (
            db.table("alert_rules")
            .select("*")
            .eq("sensor_id", sensor_id)
            .eq("is_active", True)
            .eq("trigger_on_predicted", True)
            .execute()
        )
        if not rules.data:
            return

        for rule in rules.data:
            param = _param_for_alert_type(rule["alert_type"])
            if not param:
                continue

            # Find the earliest hour where the forecast breaches the threshold
            breach_point = None
            for point in forecast:
                val = point.get(param)
                if val is None:
                    continue
                if _breaches_threshold(rule["alert_type"], val, rule["threshold_value"]):
                    breach_point = point
                    break

            if not breach_point:
                continue

            # Check for existing unacknowledged predicted alert for this rule
            existing = (
                db.table("alert_events")
                .select("id")
                .eq("sensor_id", sensor_id)
                .eq("alert_type", rule["alert_type"])
                .eq("is_predicted", True)
                .eq("acknowledged", False)
                .execute()
            )
            if existing.data:
                continue  # Already have an active predicted alert for this rule

            hours = breach_point["hours_ahead"]
            predicted_val = breach_point[param]
            direction = "rise above" if rule["alert_type"].endswith("_high") else "drop below"

            db.table("alert_events").insert({
                "sensor_id":             sensor_id,
                "alert_type":            rule["alert_type"],
                "actual_value":          predicted_val,
                "threshold_value":       rule["threshold_value"],
                "message":               f"AI forecast predicts {param} will {direction} {rule['threshold_value']} in {hours}h (predicted: {predicted_val})",
                "is_predicted":          True,
                "predicted_hours_ahead": hours,
            }).execute()
            print(f"[Predictive Alert] Created for sensor {sensor_id}: {rule['alert_type']} predicted in {hours}h")

    except Exception as e:
        print(f"[Predictive Alert] Error checking sensor {sensor_id}: {e}")
