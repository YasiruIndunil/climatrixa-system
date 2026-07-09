"""
AI Engine Service — Climatrixa
───────────────────────────────
Models:
  1. Prophet     — 24h forecast for temperature, humidity, AQI, pressure
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
from prophet import Prophet
from sklearn.ensemble import IsolationForest
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.database import db

# In-memory model cache — avoids re-downloading on every request
_model_cache: dict = {}

BUCKET = "ai-models"


# ── Supabase Storage helpers ──────────────────────────────────────────────────

def _upload_model(model, filename: str):
    """Serialize model and upload to Supabase Storage."""
    buf = io.BytesIO()
    joblib.dump(model, buf)
    buf.seek(0)
    try:
        # Remove existing file first (upsert not supported in all versions)
        db.storage.from_(BUCKET).remove([filename])
    except Exception:
        pass
    db.storage.from_(BUCKET).upload(
        path=filename,
        file=buf.getvalue(),
        file_options={"content-type": "application/octet-stream"}
    )


def _download_model(filename: str):
    """Download model from Supabase Storage and deserialize."""
    if filename in _model_cache:
        return _model_cache[filename]
    data = db.storage.from_(BUCKET).download(filename)
    model = joblib.load(io.BytesIO(data))
    _model_cache[filename] = model
    return model


def _clear_cache(sensor_id: str):
    """Clear cached models for a sensor after retraining."""
    for key in list(_model_cache.keys()):
        if sensor_id in key:
            del _model_cache[key]


# ── Data fetching ─────────────────────────────────────────────────────────────

def _get_all_readings(sensor_id: str) -> pd.DataFrame:
    """Fetch ALL readings for a sensor using pagination."""
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
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True)
    df = df.sort_values("recorded_at").reset_index(drop=True)
    return df


def _get_recent_readings(sensor_id: str, n: int = 100) -> pd.DataFrame:
    """Fetch the last N readings for anomaly detection."""
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
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True)
    df = df.sort_values("recorded_at").reset_index(drop=True)
    return df


# ── Training ──────────────────────────────────────────────────────────────────

def train_models(sensor_id: str) -> dict:
    """
    Train Prophet forecast models and Isolation Forest anomaly detector.
    Saves all models to Supabase Storage.
    Returns training summary.
    """
    df = _get_all_readings(sensor_id)

    if len(df) < 50:
        return {"error": "Not enough data — need at least 50 readings"}

    _clear_cache(sensor_id)

    # Resample to 10-minute intervals to reduce noise and speed up training
    df = df.set_index("recorded_at")
    df = df.resample("10T").mean().dropna().reset_index()
    df = df.rename(columns={"recorded_at": "ds"})

    trained = []

    # Train one Prophet model per parameter
    for param in ["temperature", "humidity", "aqi", "pressure"]:
        if param not in df.columns:
            continue
        prophet_df = df[["ds", param]].rename(columns={param: "y"}).dropna()

        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05,
            interval_width=0.80,
        )
        model.fit(prophet_df)
        _upload_model(model, f"forecast_{sensor_id}_{param}.pkl")
        trained.append(f"forecast_{param}")

    # Train Isolation Forest on all parameters
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

    return {
        "sensor_id": sensor_id,
        "readings_used": len(df),
        "trained": trained,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Forecasting ───────────────────────────────────────────────────────────────

def generate_forecast(sensor_id: str, hours_ahead: int = 24) -> list[dict]:
    """
    Load trained Prophet models and generate forecast for next N hours.
    Falls back to linear trend if models not trained yet.
    """
    forecast_rows = {}

    # Build future dataframe (hourly)
    future_times = pd.date_range(
        start=datetime.now(timezone.utc),
        periods=hours_ahead,
        freq="h",
        tz="UTC"
    )
    future_df = pd.DataFrame({"ds": future_times})

    for param in ["temperature", "humidity", "aqi", "pressure"]:
        filename = f"forecast_{sensor_id}_{param}.pkl"
        try:
            model = _download_model(filename)
            pred = model.predict(future_df)
            for i, row in pred.iterrows():
                h = i + 1
                if h not in forecast_rows:
                    forecast_rows[h] = {"hours_ahead": h}
                val = round(float(row["yhat"]), 1)
                # Clip to realistic ranges
                if param == "temperature":   val = max(0, min(60, val))
                elif param == "humidity":    val = max(0, min(100, val))
                elif param == "aqi":         val = max(0, min(500, val))
                elif param == "pressure":    val = max(900, min(1100, val))
                forecast_rows[h][param] = val
        except Exception:
            # Model not trained yet — use linear fallback
            df = _get_recent_readings(sensor_id, n=72)
            if df.empty:
                for h in range(1, hours_ahead + 1):
                    if h not in forecast_rows:
                        forecast_rows[h] = {"hours_ahead": h}
                    forecast_rows[h][param] = 0.0
            else:
                x = np.arange(len(df))
                y = df[param].values if param in df.columns else np.zeros(len(df))
                coeffs = np.polyfit(x, y, deg=1)
                future_x = np.arange(len(df), len(df) + hours_ahead)
                predicted = np.polyval(coeffs, future_x)
                for i, val in enumerate(predicted):
                    h = i + 1
                    if h not in forecast_rows:
                        forecast_rows[h] = {"hours_ahead": h}
                    forecast_rows[h][param] = round(float(val), 1)

    return [forecast_rows[h] for h in sorted(forecast_rows.keys())]


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomaly(sensor_id: str) -> tuple[bool, Optional[str]]:
    """
    Load trained Isolation Forest and check if latest reading is anomalous.
    Falls back to simple statistical check if model not trained yet.
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
        # Model not trained — use simple IQR-based check
        if len(df) < 20:
            return False, None
        features = df[["temperature", "humidity", "aqi", "pressure"]].values
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        model.fit(features[:-5])
        latest = features[-1].reshape(1, -1)
        prediction = model.predict(latest)
        is_anomaly = prediction[0] == -1

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