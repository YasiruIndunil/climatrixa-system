"""
Sensor access management — admin assigns which sensors each user can see.

Endpoints:
  POST   /access/sensors/{sensor_id}/users/{user_id}   assign sensor to user
  DELETE /access/sensors/{sensor_id}/users/{user_id}   remove assignment
  GET    /access/sensors/{sensor_id}/users             list users on sensor
  GET    /access/users/{user_id}/sensors               list sensors for user
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.security import require_admin, get_current_user
from app.core.database import db
from app.models.schemas import SensorAccessResponse, SensorResponse

router = APIRouter(prefix="/access", tags=["Sensor Access"])


@router.post("/sensors/{sensor_id}/users/{user_id}", status_code=201)
async def assign_sensor_to_user(
    sensor_id: str,
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Admin only: assign a sensor to a user so they can see its
    readings and configure alert subscriptions for it.
    """
    # Verify sensor exists
    s = db.table("sensors").select("id").eq("id", sensor_id).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Sensor not found")

    # Verify user exists
    u = db.table("users").select("id").eq("id", user_id).execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Insert (UNIQUE constraint handles duplicates gracefully)
    try:
        result = db.table("user_sensor_access").insert({
            "user_id": user_id,
            "sensor_id": sensor_id,
        }).execute()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has access to this sensor"
        )

    # Auto-create a default subscription (all parameters enabled)
    try:
        db.table("user_alert_subscriptions").insert({
            "user_id": user_id,
            "sensor_id": sensor_id,
            "temperature": True,
            "humidity": True,
            "aqi": True,
            "pressure": True,
        }).execute()
    except Exception:
        pass  # Subscription may already exist — not a hard error

    return {
        "message": "Sensor assigned to user successfully",
        "user_id": user_id,
        "sensor_id": sensor_id,
    }


@router.delete("/sensors/{sensor_id}/users/{user_id}", status_code=200)
async def unassign_sensor_from_user(
    sensor_id: str,
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Admin only: remove a user's access to a sensor.
    Also removes their alert subscription for that sensor.
    """
    result = db.table("user_sensor_access").delete()\
        .eq("sensor_id", sensor_id)\
        .eq("user_id", user_id)\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Access record not found")

    # Clean up subscription too
    db.table("user_alert_subscriptions").delete()\
        .eq("sensor_id", sensor_id)\
        .eq("user_id", user_id)\
        .execute()

    return {"message": "Sensor access removed", "user_id": user_id, "sensor_id": sensor_id}


@router.get("/sensors/{sensor_id}/users")
async def list_users_for_sensor(
    sensor_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Admin only: list all users who have access to this sensor,
    along with their alert subscription settings.
    """
    result = db.table("user_sensor_access")\
        .select("*, users(id, email, full_name, role)")\
        .eq("sensor_id", sensor_id)\
        .execute()

    return result.data


@router.get("/users/{user_id}/sensors")
async def list_sensors_for_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    List all sensors assigned to a user.
    Admin can query any user; public users can only query themselves.
    """
    requester_id = current_user.get("sub")
    requester_role = current_user.get("role")

    if requester_role != "admin" and requester_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own assigned sensors"
        )

    result = db.table("user_sensor_access")\
        .select("*, sensors(id, name, location, latitude, longitude, industry_profile, is_active)")\
        .eq("user_id", user_id)\
        .execute()

    return result.data


@router.get("/my/sensors")
async def list_my_sensors(current_user: dict = Depends(get_current_user)):
    """
    Convenience endpoint: list all sensors assigned to the currently
    logged-in user. Used by mobile and web public dashboard.
    """
    user_id = current_user.get("sub")

    result = db.table("user_sensor_access")\
        .select("*, sensors(id, name, location, latitude, longitude, industry_profile, is_active)")\
        .eq("user_id", user_id)\
        .execute()

    return [row["sensors"] for row in result.data if row.get("sensors")]
