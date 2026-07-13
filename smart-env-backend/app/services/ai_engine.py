"""
AI Engine Service — Climatrixa
───────────────────────────────
Models:
  1. statsmodels ExponentialSmoothing — 24h forecast for temperature, humidity, AQI, pressure

Model persistence:
  - train_models() fits each param's Holt-Winters model ONCE (in the
    background — via POST /ai/train/{sensor_id} or the weekly/monthly
    scheduler) and uploads the FITTED model to Supabase Storage bucket
    "ai-models", alongside the raw training series as a fallback.
  - generate_forecast() just downloads the pre-fitted model and calls the
    cheap .forecast() — no optimization on the request path. This matters
    because the in-memory cache (_model_cache) only survives for the life
    of the running process: on Render, every deploy and every free-tier
    spin-down after idle resets it, so "first login after a restart" would
    otherwise still pay the full seasonal-fit cost synchronously.
  - If a pre-fitted model is missing (sensor trained before this existed)
    or fails to unpickle (e.g. a statsmodels version bump across deploys),
    _get_fitted_model() falls back to refitting live from the raw series —
    slower, but self-healing.
  - Retrain via POST /ai/train/{sensor_id}
"""
import io
import joblib
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from datetime import datetime, timezone
from app.core.database import db

# In-memory fitted-model cache: f"{sensor_id}:{param}" -> (model, last_value, cached_at)
_model_cache: dict = {}
_MODEL_CACHE_TTL = 3600  # seconds — safety net; cache is also cleared on retrain

BUCKET = "ai-models"


# ── Supabase Storage helpers ──────────────────────────────────────────────────

def _upload_pickle(obj, filename: str):
    buf = io.BytesIO()
    joblib.dump(obj, buf)
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


def _fit_series(series: pd.Series):
    """
    Fit a Holt-Winters model on a training series — seasonal first, falling
    back to trend-only if seasonal fitting fails or produces NaN forecasts.
    This is the CPU-heavy part; call it during training (background), not
    on the forecast request path.
    """
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
            print(f"[AI] Seasonal fit failed, falling back to trend-only: {e}")
            model = None

    if model is None:
        # Trend-only fallback — always succeeds, just less accurate
        model = ExponentialSmoothing(
            series,
            trend="add",
            seasonal=None,
            initialization_method="estimated",
        ).fit(optimized=True)

    return model


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
            _upload_pickle(series, f"forecast_{sensor_id}_{param}.pkl")
            print(f"[AI] Saved training data for {param} ({len(series)} points)")
        except Exception as e:
            print(f"[AI] Error saving series for {param}: {e}")
            continue

        try:
            # Fit once here (background/training path — CPU cost is fine)
            # and upload the fitted model so forecast requests never need
            # to re-optimize on the request path, even on a cold process.
            model = _fit_series(series)
            _upload_pickle((model, float(series.iloc[-1])), f"forecast_model_{sensor_id}_{param}.pkl")
            trained.append(f"forecast_{param}")
            print(f"[AI] Fitted and saved model for {param}")
        except Exception as e:
            print(f"[AI] Error fitting/saving model for {param}: {e}")

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
    Return a cached (model, last_value) pair for this sensor+param. Tries,
    in order:
      1. In-memory cache (fast — no network call at all).
      2. The pre-fitted model uploaded by train_models() — just a download,
         no optimization, so this is fast even on a cold process.
      3. Fallback: download the raw training series and fit live. Only hit
         for sensors trained before pre-fitted models existed, or if the
         pre-fitted pickle fails to load (e.g. a statsmodels version bump
         across deploys) — self-healing rather than a hard failure.
    The in-memory entry is invalidated by _clear_cache() whenever the
    sensor is retrained, with _MODEL_CACHE_TTL as a safety net.
    """
    key = f"{sensor_id}:{param}"
    now = datetime.now(timezone.utc).timestamp()
    cached = _model_cache.get(key)
    if cached and (now - cached[2]) < _MODEL_CACHE_TTL:
        return cached[0], cached[1]

    try:
        model, last_value = _download_fresh(f"forecast_model_{sensor_id}_{param}.pkl")
    except Exception:
        series = _download_fresh(f"forecast_{sensor_id}_{param}.pkl")
        model = _fit_series(series)
        last_value = float(series.iloc[-1])

    _model_cache[key] = (model, last_value, now)
    return model, last_value


def _forecast_one_param(sensor_id: str, param: str, live_df: pd.DataFrame, hours_ahead: int) -> dict:
    result = {}
    try:
        model, last_value = _get_fitted_model(sensor_id, param)

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
            latest_actual = last_value
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

    # Sequential on purpose: Render's shared vCPU gives no real benefit from
    # threading 4 CPU-bound statsmodels fits, and concurrent threads hammering
    # the single Supabase client here previously caused requests to hang
    # indefinitely instead of just being slow. The fitted-model cache in
    # _get_fitted_model is what actually makes repeat requests fast — a warm
    # request only pays for 4 cheap .forecast() calls either way.
    for param in params:
        for h, val in _forecast_one_param(sensor_id, param, live_df, hours_ahead).items():
            forecast_rows[h][param] = val

    return [forecast_rows[h] for h in sorted(forecast_rows.keys())]