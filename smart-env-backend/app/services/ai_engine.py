"""
AI Engine Service — Climatrixa
───────────────────────────────
Models:
  1. statsmodels ExponentialSmoothing — 24h forecast for temperature, humidity, AQI, pressure

Model persistence:
  - Training series saved to Supabase Storage bucket "ai-models"
  - Fitted models are cached in-memory per sensor+param (see _model_cache) so
    forecast requests don't refit from scratch every time. Cache is cleared
    whenever a sensor is retrained, and safety-net-expires after
    _MODEL_CACHE_TTL in case retrain isn't triggered for a long time.
  - Retrain via POST /ai/train/{sensor_id}
"""
import io
import joblib
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from datetime import datetime, timezone
from app.core.database import db

# In-memory fitted-model cache: f"{sensor_id}:{param}" -> (model, series, cached_at)
_model_cache: dict = {}
_MODEL_CACHE_TTL = 3600  # seconds — safety net; cache is also cleared on retrain

BUCKET = "ai-models"


# ── Supabase Storage helpers ──────────────────────────────────────────────────

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

    print(f"[AI] Training complete: {trained}")

    return {
        "sensor_id": sensor_id,
        "readings_used": len(df),
        "trained": trained,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Forecasting ───────────────────────────────────────────────────────────────

def _get_fitted_model(sensor_id: str, param: str):
    """
    Return a cached (model, series) pair for this sensor+param, fitting and
    caching it only if there's no fresh entry. A seasonal Holt-Winters fit
    over ~1000 points is the expensive part of a forecast request — reusing
    it across requests is what makes repeat forecasts fast. The cache is
    invalidated by _clear_cache() whenever the sensor is retrained (so it
    never serves stale-shaped forecasts), with _MODEL_CACHE_TTL as a safety
    net in case retrain doesn't run for a long time.
    """
    key = f"{sensor_id}:{param}"
    now = datetime.now(timezone.utc).timestamp()
    cached = _model_cache.get(key)
    if cached and (now - cached[2]) < _MODEL_CACHE_TTL:
        return cached[0], cached[1]

    series = _download_fresh(f"forecast_{sensor_id}_{param}.pkl")

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

    _model_cache[key] = (model, series, now)
    return model, series


def _forecast_one_param(sensor_id: str, param: str, live_df: pd.DataFrame, hours_ahead: int) -> dict:
    result = {}
    try:
        model, series = _get_fitted_model(sensor_id, param)

        steps = hours_ahead * 6
        pred = model.forecast(steps)
        pred_values = pred.values

        # ── Bias correction: anchor to the ACTUAL live latest reading ──
        # ExponentialSmoothing's own extrapolated starting point can lag
        # behind reality, AND the training series itself is a snapshot
        # from whenever the model was last trained (readings keep
        # arriving via MQTT every ~30s after that). We shift the whole
        # forecast curve to start from the live value, while preserving
        # the trend/seasonal SHAPE the model learned. This runs fresh on
        # every request regardless of model caching, so accuracy is
        # unaffected by reusing the cached fit.
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
            result[h] = val

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
                result[h] = val
        else:
            df2 = _get_recent_readings(sensor_id, n=20)
            default = round(float(df2[param].mean()), 1) if not df2.empty and param in df2.columns else 0.0
            for h in range(1, hours_ahead + 1):
                result[h] = default

    return result


def generate_forecast(sensor_id: str, hours_ahead: int = 24) -> list[dict]:
    forecast_rows = {h: {"hours_ahead": h, "temperature": None, "humidity": None, "aqi": None, "pressure": None} for h in range(1, hours_ahead + 1)}

    # Fetch the truly live latest reading once — used to anchor every
    # parameter's forecast so it starts from current reality, not from
    # the model's own possibly-lagged extrapolation or a stale training snapshot
    live_df = _get_recent_readings(sensor_id, n=1)

    params = ["temperature", "humidity", "aqi", "pressure"]

    # The 4 params are independent — download/fit/forecast them concurrently
    # instead of one after another. Combined with the fitted-model cache in
    # _get_fitted_model, a cold request now pays for 4 parallel fits instead
    # of 4 sequential ones, and a warm request only pays for 4 cheap
    # .forecast() calls.
    with ThreadPoolExecutor(max_workers=len(params)) as pool:
        futures = {
            pool.submit(_forecast_one_param, sensor_id, param, live_df, hours_ahead): param
            for param in params
        }
        for future in futures:
            param = futures[future]
            for h, val in future.result().items():
                forecast_rows[h][param] = val

    return [forecast_rows[h] for h in sorted(forecast_rows.keys())]