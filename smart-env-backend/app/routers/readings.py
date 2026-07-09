from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from typing import List, Optional
import json
from datetime import datetime, timezone
from app.models.schemas import ReadingCreate, ReadingResponse, LatestReadingsResponse
from app.core.database import db
from app.core.security import require_admin
from app.services.alert_service import check_and_trigger_alerts
from app.core.timezone import utc_to_slst, format_slst
from fastapi.responses import StreamingResponse, Response
from io import StringIO
import csv

router = APIRouter(prefix="/readings", tags=["Readings"])

# ── WebSocket connection manager ──────────────────────────────────────────────
from app.core.ws_manager import manager



# ── HTTP endpoints ────────────────────────────────────────────────────────────

@router.post("/", response_model=ReadingResponse, status_code=201)
async def store_reading(body: ReadingCreate):
    """
    Store a new sensor reading sent by an ESP32.
    The ESP32 sends its api_key for authentication (no JWT needed on the device).

    Example ESP32 payload:
    {
        "sensor_id": "uuid-here",
        "temperature": 28.5,
        "humidity": 62.3,
        "aqi": 45.0,
        "pressure": 1013.2,
        "api_key": "your-device-api-key"
    }
    """
    # Validate the device API key
    sensor = (
        db.table("sensors")
        .select("id, is_active")
        .eq("id", body.sensor_id)
        .eq("api_key", body.api_key)
        .execute()
    )
    if not sensor.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sensor_id or api_key"
        )
    if not sensor.data[0]["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sensor is inactive"
        )

    # Save the reading
    insert_data = {
        "sensor_id": body.sensor_id,
        "temperature": body.temperature,
        "humidity": body.humidity,
        "aqi": body.aqi,
        "pressure": body.pressure,
    }
    if body.recorded_at:
        insert_data["recorded_at"] = body.recorded_at

    result = db.table("readings").insert(insert_data).execute()

    reading = result.data[0]

    # Broadcast to all live WebSocket clients (Flutter app, web dashboard)
    await manager.broadcast({
        "event": "new_reading",
        "data": reading
    })

    # Check alert thresholds and fire alerts if needed
    await check_and_trigger_alerts(body.sensor_id, reading)

    # Add local time fields to response
    recorded_utc = datetime.fromisoformat(
        reading["recorded_at"].replace("Z", "+00:00")
    )
    return {
        **reading,
        "recorded_at_local":   utc_to_slst(recorded_utc),
        "recorded_at_display": format_slst(recorded_utc),
    }


@router.get("/latest", response_model=List[LatestReadingsResponse])
async def latest_readings():
    """
    Get the most recent reading from every active sensor.
    Used by the mobile app home screen and web dashboard overview.
    """
    # Get all active sensors
    sensors = db.table("sensors").select("*").eq("is_active", True).execute()

    results = []
    for sensor in sensors.data:
        # Get the latest reading for this sensor
        latest = (
            db.table("readings")
            .select("*")
            .eq("sensor_id", sensor["id"])
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest.data:
            r = latest.data[0]
            recorded_utc = datetime.fromisoformat(
                r["recorded_at"].replace("Z", "+00:00")
            )
            results.append({
                **r,
                "sensor_name":        sensor["name"],
                "location":           sensor["location"],
                "aqi_status":         _aqi_label(r["aqi"]),
                "recorded_at_local":  utc_to_slst(recorded_utc),
                "recorded_at_display": format_slst(recorded_utc),
            })

    return results


def _aqi_label(aqi: float) -> str:
    """Convert AQI number to human-readable label."""
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for sensitive groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/live")
async def live_readings_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time readings.

    Connect from Flutter:
        final channel = WebSocketChannel.connect(Uri.parse('wss://your-api/readings/ws/live'));

    Connect from React:
        const ws = new WebSocket('wss://your-api/readings/ws/live');

    The server sends a JSON message every time a new reading is stored:
        { "event": "new_reading", "data": { ...reading fields... } }
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive — wait for any client message (ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)




@router.get("/export")
async def export_readings(
    sensor_id: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    format: str = "csv",
    admin: dict = Depends(require_admin)
):
    query = db.table("readings").select("*")
    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    if from_:
        query = query.gte("recorded_at", from_)
    if to:
        query = query.lte("recorded_at", to)
    result = query.order("recorded_at", desc=True).execute()
    rows = result.data or []

    if format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
        from io import BytesIO
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        data = [["Sensor ID", "Temperature", "Humidity", "AQI", "Pressure", "Recorded At"]]
        for r in rows:
            data.append([r.get("sensor_id",""), r.get("temperature",""), r.get("humidity",""), r.get("aqi",""), r.get("pressure",""), r.get("recorded_at","")])
        table = Table(data)
        table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.teal),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.5,colors.grey)]))
        doc.build([table])
        buf.seek(0)
        return Response(content=buf.read(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=readings.pdf"})

    # CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["sensor_id","temperature","humidity","aqi","pressure","recorded_at"])
    for r in rows:
        writer.writerow([r.get("sensor_id"), r.get("temperature"), r.get("humidity"), r.get("aqi"), r.get("pressure"), r.get("recorded_at")])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=readings.csv"})