from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from datetime import datetime, timezone
from app.models.schemas import PredictionResponse
from app.services.ai_engine import generate_forecast, detect_anomaly, train_models
from app.core.security import require_admin
from app.core.database import db

router = APIRouter(prefix="/ai", tags=["AI Predictions"])


@router.post("/train/{sensor_id}")
async def train_sensor_models(
    sensor_id: str,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_admin)
):
    """
    Train Prophet forecast + Isolation Forest anomaly models for a sensor.
    Runs in background so request returns immediately.
    Admin only.
    """
    sensor = db.table("sensors").select("id, name").eq("id", sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    def _train():
        result = train_models(sensor_id)
        print(f"[AI] Training complete for {sensor_id}: {result}")

    background_tasks.add_task(_train)

    return {
        "message": f"Training started for sensor {sensor.data[0]['name']}. This takes 30-90 seconds.",
        "sensor_id": sensor_id,
    }


@router.get("/train/status/{sensor_id}")
async def get_train_status(
    sensor_id: str,
    admin: dict = Depends(require_admin)
):
    """Check if models are trained for a sensor by checking Supabase Storage."""
    try:
        files = db.storage.from_("ai-models").list()
        trained_files = [f["name"] for f in files if sensor_id in f["name"]]
        is_trained = any(f"forecast_{sensor_id}_temperature.pkl" in f for f in trained_files)
        return {
            "sensor_id": sensor_id,
            "is_trained": is_trained,
            "model_files": trained_files,
        }
    except Exception as e:
        return {"sensor_id": sensor_id, "is_trained": False, "error": str(e)}


@router.get("/forecast/{sensor_id}", response_model=PredictionResponse)
async def get_prediction(sensor_id: str, hours: int = 24):
    """
    Get AI forecast for the next N hours and anomaly detection result.
    Uses trained Prophet models if available, falls back to linear trend.
    """
    sensor = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    forecast = generate_forecast(sensor_id, hours_ahead=min(hours, 48))
    is_anomaly, anomaly_desc = detect_anomaly(sensor_id)

    # Save prediction to DB for historical reference
    try:
        db.table("predictions").insert({
            "sensor_id":        sensor_id,
            "forecast_json":    forecast,
            "anomaly_detected": is_anomaly,
            "anomaly_desc":     anomaly_desc,
        }).execute()
    except Exception:
        pass  # Non-critical — don't fail the request if insert fails

    return PredictionResponse(
        sensor_id=sensor_id,
        generated_at=datetime.now(timezone.utc),
        forecast=forecast,
        anomaly_detected=is_anomaly,
        anomaly_description=anomaly_desc,
    )