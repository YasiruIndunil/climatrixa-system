from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from datetime import datetime, timezone
import traceback
import numpy as np
from app.models.schemas import PredictionResponse
from app.services.ai_engine import generate_forecast, detect_anomaly, train_models
from app.services.predictive_alerts import check_predicted_alerts
from app.core.security import require_admin
from app.core.database import db

router = APIRouter(prefix="/ai", tags=["AI Predictions"])

# In-memory forecast cache — keeps Dashboard and SensorDetail consistent for 5 min
_forecast_cache: dict = {}


@router.post("/train/{sensor_id}")
async def train_sensor_models(
    sensor_id: str,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_admin)
):
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
async def get_train_status(sensor_id: str, admin: dict = Depends(require_admin)):
    try:
        files = db.storage.from_("ai-models").list()
        trained_files = [f["name"] for f in files if sensor_id in f.get("name", "")]
        is_trained = f"forecast_{sensor_id}_temperature.pkl" in trained_files
        return {"sensor_id": sensor_id, "is_trained": is_trained, "model_files": trained_files}
    except Exception as e:
        return {"sensor_id": sensor_id, "is_trained": False, "error": str(e)}


@router.get("/schedule/logs")
async def get_schedule_logs(limit: int = 20, admin: dict = Depends(require_admin)):
    result = db.table("schedule_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.get("/debug/forecast/{sensor_id}")
async def debug_forecast(sensor_id: str, admin: dict = Depends(require_admin)):
    """Debug endpoint to check what forecast values are returned per param."""
    from app.services.ai_engine import _download_model, _get_recent_readings
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    results = {}
    for param in ["temperature", "humidity", "aqi", "pressure"]:
        filename = f"forecast_{sensor_id}_{param}.pkl"
        try:
            series = _download_model(filename)
            results[param] = {"series_len": len(series), "series_type": str(type(series))}
            model = ExponentialSmoothing(
                series, trend="add", seasonal=None, initialization_method="estimated"
            ).fit(optimized=True)
            pred = model.forecast(6)
            results[param]["forecast_6h"] = [round(float(v), 2) for v in pred.values]
            results[param]["has_nan"] = bool(np.isnan(pred.values).any())
        except Exception as e:
            results[param] = {"error": str(e), "traceback": traceback.format_exc()}
    return results


@router.get("/forecast/{sensor_id}", response_model=PredictionResponse)
async def get_prediction(sensor_id: str, hours: int = 24):
    sensor = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not sensor.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    # ── Cache: return the same forecast for 5 minutes so Dashboard and
    #    SensorDetail show identical numbers instead of drifting per-call ──
    cache_key = f"{sensor_id}:{hours}"
    now = datetime.now(timezone.utc)
    cached = _forecast_cache.get(cache_key)
    if cached and (now - cached["cached_at"]).total_seconds() < 300:
        return cached["response"]

    forecast = generate_forecast(sensor_id, hours_ahead=min(hours, 48))
    is_anomaly, anomaly_desc = detect_anomaly(sensor_id)

    try:
        db.table("predictions").insert({
            "sensor_id":        sensor_id,
            "forecast_json":    forecast,
            "anomaly_detected": is_anomaly,
            "anomaly_desc":     anomaly_desc,
        }).execute()
    except Exception:
        pass

    # ── Anomaly → create a real alert event so it shows up like any other alert ──
    if is_anomaly:
        try:
            existing = (
                db.table("alert_events")
                .select("id")
                .eq("sensor_id", sensor_id)
                .eq("alert_type", "anomaly")
                .eq("acknowledged", False)
                .execute()
            )
            if not existing.data:
                latest = db.table("readings").select("temperature").eq("sensor_id", sensor_id).order("recorded_at", desc=True).limit(1).execute()
                actual = latest.data[0]["temperature"] if latest.data else 0
                db.table("alert_events").insert({
                    "sensor_id":       sensor_id,
                    "alert_type":      "anomaly",
                    "actual_value":    actual,
                    "threshold_value": 0,
                    "message":         anomaly_desc or "Unusual reading pattern detected",
                }).execute()
        except Exception as e:
            print(f"[Anomaly Alert] Error creating alert: {e}")

    # ── Predictive alerting — check forecast against rules with trigger_on_predicted ──
    check_predicted_alerts(sensor_id, forecast)

    response = PredictionResponse(
        sensor_id=sensor_id,
        generated_at=now,
        forecast=forecast,
        anomaly_detected=is_anomaly,
        anomaly_description=anomaly_desc,
    )
    _forecast_cache[cache_key] = {"response": response, "cached_at": now}
    return response
