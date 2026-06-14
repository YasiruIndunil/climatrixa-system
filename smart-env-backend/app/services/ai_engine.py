"""
AI Engine Service
─────────────────
Two functions:
  1. generate_forecast()   — predict next 24 hours using linear trend
  2. detect_anomaly()      — flag unusual readings using Isolation Forest

For a production system, replace the linear trend with a trained LSTM or Prophet model.
The interface (inputs / outputs) stays exactly the same — only the model changes.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from datetime import datetime, timezone
from typing import Optional
from app.core.database import db


def _get_recent_readings(sensor_id: str, n: int = 100) -> pd.DataFrame:
    """
    Fetch the last N readings for a sensor from Supabase.
    Returns a pandas DataFrame sorted oldest → newest.
    """
    result = (
        db.table("readings")
        .select("temperature, humidity, aqi, recorded_at")
        .eq("sensor_id", sensor_id)
        .order("recorded_at", desc=True)
        .limit(n)
        .execute()
    )

    if not result.data:
        return pd.DataFrame()

    df = pd.DataFrame(result.data)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"])
    df = df.sort_values("recorded_at")   # oldest first
    return df


def generate_forecast(sensor_id: str, hours_ahead: int = 24) -> list[dict]:
    """
    Generate a simple linear trend forecast for the next N hours.

    Returns a list of dicts:
    [
        {"hours_ahead": 1, "temperature": 28.5, "humidity": 62.1, "aqi": 44.0},
        {"hours_ahead": 2, ...},
        ...
    ]

    To upgrade to LSTM:
    - Train a Keras LSTM on historical data, save as .h5
    - Load it here and call model.predict(X) instead of np.polyval()
    """
    df = _get_recent_readings(sensor_id, n=72)  # last 72 readings

    if len(df) < 5:
        # Not enough data — return flat forecast based on last known value
        last = df.iloc[-1] if not df.empty else {"temperature": 25, "humidity": 60, "aqi": 50}
        return [
            {
                "hours_ahead": h,
                "temperature": round(float(last.get("temperature", 25)), 1),
                "humidity": round(float(last.get("humidity", 60)), 1),
                "aqi": round(float(last.get("aqi", 50)), 1),
            }
            for h in range(1, hours_ahead + 1)
        ]

    x = np.arange(len(df))
    forecast = []

    for col in ["temperature", "humidity", "aqi"]:
        y = df[col].values
        # Fit a degree-1 polynomial (linear trend) through the data
        coeffs = np.polyfit(x, y, deg=1)
        # Predict future values
        future_x = np.arange(len(df), len(df) + hours_ahead)
        predicted = np.polyval(coeffs, future_x)

        # Clip values to realistic ranges
        if col == "temperature":
            predicted = np.clip(predicted, 0, 60)
        elif col == "humidity":
            predicted = np.clip(predicted, 0, 100)
        elif col == "aqi":
            predicted = np.clip(predicted, 0, 500)

        if not forecast:
            forecast = [{"hours_ahead": i + 1} for i in range(hours_ahead)]
        for i, val in enumerate(predicted):
            forecast[i][col] = round(float(val), 1)

    return forecast


def detect_anomaly(sensor_id: str) -> tuple[bool, Optional[str]]:
    """
    Use Isolation Forest to detect if recent readings are anomalous.

    Returns:
        (is_anomaly: bool, description: Optional[str])

    Isolation Forest works well with no labelled data — it learns the
    "normal" distribution and flags anything far from that normal.

    To upgrade: train a more complex model on longer history, use LSTM autoencoder.
    """
    df = _get_recent_readings(sensor_id, n=100)

    if len(df) < 20:
        # Need at least 20 readings to detect anomalies meaningfully
        return False, None

    features = df[["temperature", "humidity", "aqi"]].values

    # Fit Isolation Forest on all but the last 5 readings (the "history")
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,   # assume 5% of readings could be anomalous
        random_state=42
    )
    model.fit(features[:-5])

    # Check if the most recent reading is an anomaly
    latest = features[-1].reshape(1, -1)
    prediction = model.predict(latest)   # -1 = anomaly, 1 = normal

    if prediction[0] == -1:
        # Build a human-readable description
        last_row = df.iloc[-1]
        desc_parts = []
        mean = df[["temperature", "humidity", "aqi"]].mean()

        if abs(last_row["temperature"] - mean["temperature"]) > 5:
            desc_parts.append(
                f"Temperature {last_row['temperature']:.1f}°C vs avg {mean['temperature']:.1f}°C"
            )
        if abs(last_row["humidity"] - mean["humidity"]) > 10:
            desc_parts.append(
                f"Humidity {last_row['humidity']:.1f}% vs avg {mean['humidity']:.1f}%"
            )
        if abs(last_row["aqi"] - mean["aqi"]) > 20:
            desc_parts.append(
                f"AQI {last_row['aqi']:.1f} vs avg {mean['aqi']:.1f}"
            )

        desc = "; ".join(desc_parts) if desc_parts else "Unusual reading pattern detected"
        return True, desc

    return False, None
