"""
Smart Environmental Monitoring System — FastAPI Backend
───────────────────────────────────────────────────────
Entry point: uvicorn app.main:app --reload

Interactive docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, sensors, readings, predictions, alerts
from app.services.mqtt_client import start_mqtt_listener, stop_mqtt_listener

settings = get_settings()


# ── Lifespan: startup and shutdown events ─────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code before 'yield' runs at startup.
    Code after 'yield' runs at shutdown.
    """
    print(f"Starting {settings.app_name} v{settings.app_version}")

    # Start MQTT subscriber in background thread
    # This listens for ESP32 data published to HiveMQ
    start_mqtt_listener()

    yield  # App is running

    # Cleanup on shutdown
    stop_mqtt_listener()
    print("Server shutting down.")


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    ## IoT Smart Environmental Monitoring System

    Cloud backend for real-time environmental data collection, AI prediction,
    and alert management.

    ### How ESP32 sends data
    The ESP32 device POSTs to `/readings/` with its `api_key` for authentication.
    It can also publish via MQTT to `smartenv/{sensor_id}/data`.

    ### How mobile/web apps get data
    - REST API: GET endpoints for sensors, readings, predictions
    - WebSocket: connect to `/readings/ws/live` for real-time stream

    ### Authentication
    - Admins and users authenticate via `/auth/login` → get JWT token
    - Include in header: `Authorization: Bearer <token>`
    """,
    lifespan=lifespan,
)


# ── CORS (Cross-Origin Resource Sharing) ──────────────────────────────────────
# Allows Flutter web, React, and local dev to call the API

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers ──────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(sensors.router)
app.include_router(readings.router)
app.include_router(predictions.router)
app.include_router(alerts.router)


# ── Health check endpoint ──────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Used by Render to check if the service is alive."""
    return {"status": "healthy"}
