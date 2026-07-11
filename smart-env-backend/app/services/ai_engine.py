"""
AI Engine Service — Climatrixa
───────────────────────────────
Models:
  1. statsmodels ExponentialSmoothing — 24h forecast for temperature, humidity, AQI, pressure
  2. IsolationForest — anomaly detection on recent readings

Model persistence:
  - Training series saved to Supabase Storage bucket "ai-models"
  - Refitted on each forecast request (avoids pickle compatibility issues)
  - Retrain via POST /ai/train/{sensor_id}
"""
import io
import joblib
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.ensemble import IsolationForest
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.database import db

# In-memory model cache — cleared before each forecast to avoid stale data
_model_cache: dict = {}

BUCKET = "ai-models"


# ── Supabase Storage helpers ──────────────────────────────────────────────────

def _upload_model(model, filename: str):
    buf = io.BytesIO()
    joblib.dump(model, buf)
    buf.seek(0)
    try:
        db.storage.from_(BUCKET).remove([filename])
    except Exception:
        pass
    db.storage.from_(BUCKET).upload(
        path=filename,
        file=buf.getvalue(),
        file_options={"content-type": "application/octet-stream"}
    )


def _upload_series(series: pd.Series, filename: str):
    buf = io.BytesIO()
    joblib.dump(series, buf)
    buf.seek(0)
    try:
        db.storage.from_(BUCKET).remove([filename])
    except Exception:
        pass
    db.storage.from_(BUCKET).upload(
        path=filename,
        file=buf.getvalue(),
        file_options={"content-type": "application/octet-stream"}
    )


def _download_fresh(filename: str):
    """Always download fresh from storage — never use cache."""
    data = db.storage.from_(BUCKET).download(filename)
    return joblib.load(io.BytesIO(data))


def _clear_cache(sensor_id: str):
    for key in list(_model_cache.keys()):
        if sensor_id in key:
            del _model_cache[key]


# ── Data fetching ─────────────────────────────────────────────────────────────

def _get_all_readings(sensor_id: str) -> pd.DataFrame:
    all_rows = []
    page = 0
    page_size = 1000
    while True:
        result = (
            db.table("readings")
            .select("temperature, humidity, aqi, pressure, recorded_at")
            .eq("sensor_id", sensor_id)
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

    if not all_rows:
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format='ISO8601')
    df = df.sort_values("recorded_at").reset_index(drop=True)
    return df


def _get_recent_readings(sensor_id: str, n: int = 200) -> pd.DataFrame:
    result = (
        db.table("readings")
        .select("temperature, humidity, aqi, pressure, recorded_at")
        .eq("sensor_id", sensor_id)
        .order("recorded_at", desc=True)
        .limit(n)
        .execute()
    )
    if not result.data:
        return pd.DataFrame()
    df = pd.DataFrame(result.data)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format='ISO8601')
    df = df.sort_values("recorded_at").reset_index(drop=True)
    return df


# ── Training ──────────────────────────────────────────────────────────────────

def train_models(sensor_id: str) -> dict:
    print(f"[AI] Fetching readings for {sensor_id}...")
    df = _get_all_readings(sensor_id)

    if len(df) < 50:
        return {"error": "Not enough data — need at least 50 readings"}

    _clear_cache(sensor_id)

    # Resample to 10-minute intervals
    df = df.set_index("recorded_at")
    df = df.resample("10min").mean().dropna().reset_index()

    # Only train on the last 7 days — keeps the model reflecting CURRENT
    # conditions instead of averaging over weeks/months of old data
    cutoff = df["recorded_at"].max() - pd.Timedelta(days=7)
    df = df[df["recorded_at"] >= cutoff].reset_index(drop=True)

    print(f"[AI] Training on {len(df)} resampled readings (last 7 days)...")
    trained = []

    for param in ["temperature", "humidity", "aqi", "pressure"]:
        if param not in df.columns:
            continue
        series = df[param].dropna()
        try:
            _upload_series(series, f"forecast_{sensor_id}_{param}.pkl")
            trained.append(f"forecast_{param}")
            print(f"[AI] Saved training data for {param} ({len(series)} points)")
        except Exception as e:
            print(f"[AI] Error saving {param}: {e}")

    # Train Isolation Forest anomaly detector
    features = df[["temperature", "humidity", "aqi", "pressure"]].dropna().values
    iso = IsolationForest(n_estimators=200, contamination=0.03, random_state=42, n_jobs=-1)
    iso.fit(features)
    _upload_model(iso, f"anomaly_{sensor_id}.pkl")
    trained.append("anomaly_detector")
    print(f"[AI] Training complete: {trained}")

    return {
        "sensor_id": sensor_id,
        "readings_used": len(df),
        "trained": trained,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Forecasting ───────────────────────────────────────────────────────────────

def generate_forecast(sensor_id: str, hours_ahead: int = 24) -> list[dict]:
    forecast_rows = {h: {"hours_ahead": h, "temperature": None, "humidity": None, "aqi": None, "pressure": None} for h in range(1, hours_ahead + 1)}

    # Fetch the truly live latest reading once — used to anchor every
    # parameter's forecast so it starts from current reality, not from
    # the model's own possibly-lagged extrapolation or a stale training snapshot
    live_df = _get_recent_readings(sensor_id, n=1)

    for param in ["temperature", "humidity", "aqi", "pressure"]:
        filename = f"forecast_{sensor_id}_{param}.pkl"
        try:
            # Always download fresh — never use stale in-memory cache
            series = _download_fresh(filename)

            # 10-min resolution → 144 points = 1 day. Need at least 2 full
            # days of data for seasonal fitting to be meaningful/stable.
            seasonal_periods = 144
            use_seasonal = len(series) >= seasonal_periods * 2

            model = None
            if use_seasonal:
                try:
                    model = ExponentialSmoothing(
                        series,
                        trend="add",
                        seasonal="add",
                        seasonal_periods=seasonal_periods,
                        initialization_method="estimated",
                    ).fit(optimized=True)
                    # Sanity check — if the fitted model immediately produces
                    # NaN forecasts, treat it as a failed fit and fall back
                    test_pred = model.forecast(6)
                    if np.isnan(test_pred.values).any():
                        model = None
                except Exception as e:
                    print(f"[AI] Seasonal fit failed for {param}, falling back to trend-only: {e}")
                    model = None

            if model is None:
                # Trend-only fallback — always succeeds, just less accurate
                model = ExponentialSmoothing(
                    series,
                    trend="add",
                    seasonal=None,
                    initialization_method="estimated",
                ).fit(optimized=True)

            steps = hours_ahead * 6
            pred = model.forecast(steps)
            pred_values = pred.values

            # ── Bias correction: anchor to the ACTUAL live latest reading ──
            # ExponentialSmoothing's own extrapolated starting point can lag
            # behind reality, AND the training series itself is a snapshot
            # from whenever the model was last trained (readings keep
            # arriving via MQTT every ~30s after that). We shift the whole
            # forecast curve to start from the live value, while preserving
            # the trend/seasonal SHAPE the model learned.
            if not live_df.empty and param in live_df.columns and live_df[param].notna().any():
                latest_actual = float(live_df[param].iloc[-1])
            else:
                latest_actual = float(series.iloc[-1])
            model_start = float(pred_values[0])
            bias = latest_actual - model_start
            pred_values = pred_values + bias

            for h in range(1, hours_ahead + 1):
                hour_preds = pred_values[(h - 1) * 6: h * 6]
                mean_val = float(np.mean(hour_preds))
                if np.isnan(mean_val):
                    raise ValueError(f"NaN in forecast for {param}")
                val = round(mean_val, 1)
                if param == "temperature":   val = max(0, min(60, val))
                elif param == "humidity":    val = max(0, min(100, val))
                elif param == "aqi":         val = max(0, min(1500, val))
                elif param == "pressure":    val = max(900, min(1100, val))
                forecast_rows[h][param] = val

        except Exception as e:
            print(f"[AI] Forecast fallback for {param}: {e}")
            # Linear trend fallback
            df = _get_recent_readings(sensor_id, n=72)
            if not df.empty and param in df.columns and df[param].notna().sum() > 5:
                x = np.arange(len(df))
                y = df[param].ffill().values
                coeffs = np.polyfit(x, y, deg=1)
                future_x = np.arange(len(df), len(df) + hours_ahead)
                predicted = np.polyval(coeffs, future_x)
                for h, val in enumerate(predicted, 1):
                    val = round(float(val), 1)
                    if param == "pressure": val = max(900, min(1100, val))
                    forecast_rows[h][param] = val
            else:
                df2 = _get_recent_readings(sensor_id, n=20)
                default = round(float(df2[param].mean()), 1) if not df2.empty and param in df2.columns else 0.0
                for h in range(1, hours_ahead + 1):
                    forecast_rows[h][param] = default

    return [forecast_rows[h] for h in sorted(forecast_rows.keys())]


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomaly(sensor_id: str) -> tuple[bool, Optional[str]]:
    df = _get_recent_readings(sensor_id, n=100)

    if len(df) < 5:
        return False, None

    try:
        model = _download_fresh(f"anomaly_{sensor_id}.pkl")
        latest = df[["temperature", "humidity", "aqi", "pressure"]].iloc[-1].values.reshape(1, -1)
        prediction = model.predict(latest)
        is_anomaly = prediction[0] == -1
    except Exception:
        if len(df) < 20:
            return False, None
        features = df[["temperature", "humidity", "aqi", "pressure"]].values
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        model.fit(features[:-5])
        latest = features[-1].reshape(1, -1)
        is_anomaly = model.predict(latest)[0] == -1

    if is_anomaly:
        last_row = df.iloc[-1]
        mean = df[["temperature", "humidity", "aqi", "pressure"]].mean()
        desc_parts = []
        if abs(last_row["temperature"] - mean["temperature"]) > 5:
            desc_parts.append(f"Temperature {last_row['temperature']:.1f}°C vs avg {mean['temperature']:.1f}°C")
        if abs(last_row["humidity"] - mean["humidity"]) > 10:
            desc_parts.append(f"Humidity {last_row['humidity']:.1f}% vs avg {mean['humidity']:.1f}%")
        if abs(last_row["aqi"] - mean["aqi"]) > 20:
            desc_parts.append(f"AQI {last_row['aqi']:.1f} vs avg {mean['aqi']:.1f}")
        if abs(last_row["pressure"] - mean["pressure"]) > 5:
            desc_parts.append(f"Pressure {last_row['pressure']:.1f} hPa vs avg {mean['pressure']:.1f} hPa")
        desc = "; ".join(desc_parts) if desc_parts else "Unusual reading pattern detected"
        return True, desc

    return False, None


# ── Real-time anomaly detection (called on every MQTT reading) ────────────────

_anomaly_model_cache: dict = {}   # sensor_id -> (model, cached_at)
_ANOMALY_CACHE_TTL = 600          # 10 minutes — model only changes on retrain


def _get_cached_anomaly_model(sensor_id: str):
    """
    Load the Isolation Forest model with a short in-memory cache.
    Real-time checks run every ~30s per sensor — re-downloading from
    Supabase Storage on every single reading would be wasteful and slow.
    The model itself only changes on weekly/monthly retrain, so a
    10-minute cache is safe and keeps ingestion fast.
    """
    now = datetime.now(timezone.utc).timestamp()
    cached = _anomaly_model_cache.get(sensor_id)
    if cached and (now - cached[1]) < _ANOMALY_CACHE_TTL:
        return cached[0]

    model = _download_fresh(f"anomaly_{sensor_id}.pkl")
    _anomaly_model_cache[sensor_id] = (model, now)
    return model


def check_reading_anomaly(sensor_id: str, reading: dict) -> tuple[bool, Optional[str]]:
    """
    Score a SINGLE incoming reading against the cached Isolation Forest
    model. Called from the MQTT ingestion pipeline on every reading,
    alongside check_and_trigger_alerts, so anomalies are caught within
    seconds instead of only when someone opens the forecast page.
    """
    try:
        model = _get_cached_anomaly_model(sensor_id)
    except Exception:
        # No trained model yet for this sensor — skip silently
        return False, None

    try:
        features = [[
            reading.get("temperature") or 0,
            reading.get("humidity") or 0,
            reading.get("aqi") or 0,
            reading.get("pressure") or 0,
        ]]
        prediction = model.predict(features)
        is_anomaly = prediction[0] == -1
    except Exception as e:
        print(f"[AI] Anomaly scoring failed for {sensor_id}: {e}")
        return False, None

    if not is_anomaly:
        return False, None

    # Build description by comparing against recent baseline
    df = _get_recent_readings(sensor_id, n=50)
    desc = "Unusual reading pattern detected"
    if not df.empty:
        mean = df[["temperature", "humidity", "aqi", "pressure"]].mean()
        parts = []
        if reading.get("temperature") is not None and abs(reading["temperature"] - mean["temperature"]) > 5:
            parts.append(f"Temperature {reading['temperature']:.1f}°C vs avg {mean['temperature']:.1f}°C")
        if reading.get("humidity") is not None and abs(reading["humidity"] - mean["humidity"]) > 10:
            parts.append(f"Humidity {reading['humidity']:.1f}% vs avg {mean['humidity']:.1f}%")
        if reading.get("aqi") is not None and abs(reading["aqi"] - mean["aqi"]) > 20:
            parts.append(f"AQI {reading['aqi']:.1f} vs avg {mean['aqi']:.1f}")
        if reading.get("pressure") is not None and abs(reading["pressure"] - mean["pressure"]) > 5:
            parts.append(f"Pressure {reading['pressure']:.1f} hPa vs avg {mean['pressure']:.1f} hPa")
        if parts:
            desc = "; ".join(parts)

    return True, desc


async def check_and_log_anomaly(sensor_id: str, reading: dict):
    """
    Score the reading and, if anomalous, create an alert_event —
    deduped so only one active anomaly alert exists per sensor at a time.
    Call this from the MQTT handler right after check_and_trigger_alerts.
    """
    is_anomaly, desc = check_reading_anomaly(sensor_id, reading)
    if not is_anomaly:
        return

    try:
        existing = (
            db.table("alert_events")
            .select("id")
            .eq("sensor_id", sensor_id)
            .eq("alert_type", "anomaly")
            .eq("acknowledged", False)
            .execute()
        )
        if existing.data:
            return  # Already have an unacknowledged anomaly alert — don't spam

        db.table("alert_events").insert({
            "sensor_id":       sensor_id,
            "alert_type":      "anomaly",
            "actual_value":    reading.get("temperature") or 0,
            "threshold_value": 0,
            "message":         desc,
            "is_predicted":    False,
        }).execute()
        print(f"[AI] Anomaly logged for sensor {sensor_id}: {desc}")

        try:
            from app.core.ws_manager import manager
            await manager.broadcast({"event": "alert_triggered", "data": {"sensor_id": sensor_id, "message": desc}})
        except Exception:
            pass

    except Exception as e:
        print(f"[AI] Failed to log anomaly for {sensor_id}: {e}")