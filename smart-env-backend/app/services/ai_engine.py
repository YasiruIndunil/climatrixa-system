"""
AI Engine Service — Climatrixa
───────────────────────────────
Models:
  1. statsmodels ExponentialSmoothing — 24h forecast for temperature, humidity, AQI, pressure
  2. IsolationForest — anomaly detection on recent readings

Model persistence:
  - Trained models saved to Supabase Storage bucket "ai-models"
  - Downloaded and cached in memory on first prediction request
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

# In-memory model cache
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


def _download_model(filename: str):
    if filename in _model_cache:
        return _model_cache[filename]
    data = db.storage.from_(BUCKET).download(filename)
    model = joblib.load(io.BytesIO(data))
    _model_cache[filename] = model
    return model


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
    """
    Train Holt-Winters ExponentialSmoothing forecast models
    and Isolation Forest anomaly detector.
    Saves all models to Supabase Storage.
    """
    print(f"[AI] Fetching readings for {sensor_id}...")
    df = _get_all_readings(sensor_id)

    if len(df) < 50:
        return {"error": "Not enough data — need at least 50 readings"}

    _clear_cache(sensor_id)

    # Resample to 10-minute intervals
    df = df.set_index("recorded_at")
    df = df.resample("10min").mean().dropna().reset_index()

    print(f"[AI] Training on {len(df)} resampled readings...")
    trained = []

    for param in ["temperature", "humidity", "aqi", "pressure"]:
        if param not in df.columns:
            continue
        series = df[param].dropna()

        try:
            # Holt-Winters with daily seasonality
            # Each reading is 10 min, so 144 readings = 1 day
            seasonal_periods = min(144, len(series) // 2)
            model = ExponentialSmoothing(
                series,
                trend="add",
                seasonal="add" if len(series) >= seasonal_periods * 2 else None,
                seasonal_periods=seasonal_periods if len(series) >= seasonal_periods * 2 else None,
                initialization_method="estimated",
            ).fit(optimized=True)

            _upload_model(model, f"forecast_{sensor_id}_{param}.pkl")
            trained.append(f"forecast_{param}")
            print(f"[AI] Trained {param} model")
        except Exception as e:
            print(f"[AI] Error training {param}: {e}")

    # Train Isolation Forest
    features = df[["temperature", "humidity", "aqi", "pressure"]].dropna().values
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=42,
        n_jobs=-1,
    )
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
    """
    Load trained ExponentialSmoothing models and generate hourly forecast.
    Falls back to linear trend if models not trained yet.
    """
    forecast_rows = {h: {"hours_ahead": h} for h in range(1, hours_ahead + 1)}

    for param in ["temperature", "humidity", "aqi", "pressure"]:
        filename = f"forecast_{sensor_id}_{param}.pkl"
        try:
            model = _download_model(filename)
            # Forecast steps = hours_ahead * 6 (10-min intervals per hour)
            steps = hours_ahead * 6
            pred = model.forecast(steps)
            # Average each hour's 6 predictions
            for h in range(1, hours_ahead + 1):
                hour_preds = pred.iloc[(h - 1) * 6: h * 6]
                val = round(float(hour_preds.mean()), 1)
                if param == "temperature":   val = max(0, min(60, val))
                elif param == "humidity":    val = max(0, min(100, val))
                elif param == "aqi":         val = max(0, min(500, val))
                elif param == "pressure":    val = max(900, min(1100, val))
                forecast_rows[h][param] = val
        except Exception:
            # Fallback to linear trend
            df = _get_recent_readings(sensor_id, n=72)
            if not df.empty and param in df.columns:
                x = np.arange(len(df))
                y = df[param].values
                coeffs = np.polyfit(x, y, deg=1)
                future_x = np.arange(len(df), len(df) + hours_ahead)
                predicted = np.polyval(coeffs, future_x)
                for h, val in enumerate(predicted, 1):
                    forecast_rows[h][param] = round(float(val), 1)
            else:
                for h in range(1, hours_ahead + 1):
                    forecast_rows[h][param] = 0.0

    return [forecast_rows[h] for h in sorted(forecast_rows.keys())]


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomaly(sensor_id: str) -> tuple[bool, Optional[str]]:
    """
    Load trained Isolation Forest and check if latest reading is anomalous.
    """
    df = _get_recent_readings(sensor_id, n=100)

    if len(df) < 5:
        return False, None

    try:
        model = _download_model(f"anomaly_{sensor_id}.pkl")
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