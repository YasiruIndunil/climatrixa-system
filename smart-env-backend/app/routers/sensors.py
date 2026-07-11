from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.schemas import SensorCreate, SensorResponse, SensorUpdate
from app.core.security import get_current_user, require_admin
from app.core.database import db

router = APIRouter(prefix="/sensors", tags=["Sensors"])


@router.get("/", response_model=List[SensorResponse])
async def list_sensors():
    """
    Get all active sensors.
    Public endpoint — no login required.
    """
    result = db.table("sensors").select("*").eq("is_active", True).execute()
    return result.data


@router.get("/all", response_model=List[SensorResponse])
async def list_all_sensors(admin: dict = Depends(require_admin)):
    """
    Get every sensor, active and inactive. Admin only — used by the
    Sensors management page so a deactivated sensor doesn't disappear
    and become impossible to re-activate.
    """
    result = db.table("sensors").select("*").execute()
    return result.data


@router.get("/{sensor_id}", response_model=SensorResponse)
async def get_sensor(sensor_id: str):
    """Get a single sensor by its ID."""
    result = db.table("sensors").select("*").eq("id", sensor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return result.data[0]


@router.post("/", response_model=SensorResponse, status_code=201)
async def create_sensor(
    body: SensorCreate,
    admin: dict = Depends(require_admin)
):
    """
    Add a new sensor node. Admin only.
    Returns the created sensor including its generated api_key.
    Copy the api_key into your ESP32 firmware.
    """
    admin_id = admin.get("sub")
    result = db.table("sensors").insert({
        "name": body.name,
        "location": body.location,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "industry_profile": body.industry_profile or "general",
        "created_by": admin_id,
        "updated_by": admin_id,
    }).execute()

    return result.data[0]


@router.patch("/{sensor_id}", response_model=SensorResponse)
async def update_sensor(
    sensor_id: str,
    body: SensorUpdate,
    admin: dict = Depends(require_admin)
):
    """
    Update a sensor's name, location, industry profile, and/or coordinates.
    Only the fields provided in the request body are changed (PATCH semantics).
    Admin only.
    """
    existing = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )

    update_data["updated_by"] = admin.get("sub")
    update_data["updated_at"] = "NOW()"

    result = db.table("sensors").update(update_data).eq("id", sensor_id).execute()
    return result.data[0]


@router.delete("/{sensor_id}", status_code=204)
async def deactivate_sensor(
    sensor_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Deactivate a sensor (soft delete — data is preserved).
    Admin only.
    """
    result = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    db.table("sensors").update({"is_active": False}).eq("id", sensor_id).execute()
    return None


@router.get("/{sensor_id}/readings")
async def sensor_readings(sensor_id: str, limit: int = 100):
    """
    Get the most recent readings for a specific sensor.
    ?limit=100 (default) — change to get more or fewer records.
    """
    result = (
        db.table("readings")
        .select("*")
        .eq("sensor_id", sensor_id)
        .order("recorded_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data
