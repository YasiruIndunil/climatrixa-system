from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.models.schemas import PredictionResponse
from app.services.ai_engine import generate_forecast, detect_anomaly
from app.core.database import db

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])


@router.get("/{sensor_id}", response_model=PredictionResponse)
async def get_prediction(sensor_id: str, hours: int = 24):
    """
    Get an AI forecast for a sensor for the next N hours (default 24).
    Also checks for anomalies in recent readings.

    ?hours=6  — short forecast
    ?hours=24 — full day forecast (default)
    """
    # Confirm the sensor exists
    sensor = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    # Generate forecast
    forecast = generate_forecast(sensor_id, hours_ahead=min(hours, 48))

    # Check for anomalies
    is_anomaly, anomaly_desc = detect_anomaly(sensor_id)

    # Cache the prediction in Supabase (so Flutter/React can load it without re-computing)
    db.table("predictions").insert({
        "sensor_id":        sensor_id,
        "forecast_json":    forecast,
        "anomaly_detected": is_anomaly,
        "anomaly_desc":     anomaly_desc,
    }).execute()

    return PredictionResponse(
        sensor_id=sensor_id,
        generated_at=datetime.now(timezone.utc),
        forecast=forecast,
        anomaly_detected=is_anomaly,
        anomaly_description=anomaly_desc,
    )
