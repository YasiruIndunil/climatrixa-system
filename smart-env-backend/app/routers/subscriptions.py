"""
Alert subscription management — per-user, per-sensor, per-parameter.

A user only receives alerts for the parameters they have set to TRUE.
Admin can manage subscriptions for any user; users manage their own.

Endpoints:
  GET    /subscriptions/{user_id}/{sensor_id}   get subscription settings
  POST   /subscriptions/{user_id}/{sensor_id}   create subscription
  PATCH  /subscriptions/{user_id}/{sensor_id}   update parameters
  DELETE /subscriptions/{user_id}/{sensor_id}   remove subscription
  GET    /subscriptions/my                       get all my subscriptions
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.security import require_admin, get_current_user
from app.core.database import db
from app.models.schemas import SubscriptionUpdate, SubscriptionResponse

router = APIRouter(prefix="/subscriptions", tags=["Alert Subscriptions"])


def _check_access(current_user: dict, user_id: str):
    """Helper: admin can manage any user, public can only manage themselves."""
    requester_id = current_user.get("sub")
    requester_role = current_user.get("role")
    if requester_role != "admin" and requester_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own subscriptions"
        )


@router.get("/my")
async def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    """
    Get all alert subscriptions for the currently logged-in user,
    including the sensor name/location for display on the profile screen.
    """
    user_id = current_user.get("sub")
    result = db.table("user_alert_subscriptions")\
        .select("*, sensors(id, name, location, industry_profile)")\
        .eq("user_id", user_id)\
        .execute()
    return result.data


@router.get("/{user_id}/{sensor_id}")
async def get_subscription(
    user_id: str,
    sensor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get alert subscription settings for a specific user-sensor pair."""
    _check_access(current_user, user_id)

    result = db.table("user_alert_subscriptions")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("sensor_id", sensor_id)\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return result.data[0]


@router.post("/{user_id}/{sensor_id}", status_code=201)
async def create_subscription(
    user_id: str,
    sensor_id: str,
    body: SubscriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create alert subscription for a user-sensor pair.
    User must already have access to the sensor (via user_sensor_access).
    """
    _check_access(current_user, user_id)

    # Verify user has access to this sensor
    access = db.table("user_sensor_access")\
        .select("id")\
        .eq("user_id", user_id)\
        .eq("sensor_id", sensor_id)\
        .execute()

    if not access.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this sensor"
        )

    try:
        result = db.table("user_alert_subscriptions").insert({
            "user_id": user_id,
            "sensor_id": sensor_id,
            "temperature": body.temperature,
            "humidity": body.humidity,
            "aqi": body.aqi,
            "pressure": body.pressure,
            "created_by": current_user.get("sub"),
            "updated_by": current_user.get("sub"),
        }).execute()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subscription already exists — use PATCH to update"
        )

    return result.data[0]


@router.patch("/{user_id}/{sensor_id}")
async def update_subscription(
    user_id: str,
    sensor_id: str,
    body: SubscriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update which parameters this user receives alerts for on this sensor.
    Any combination of temperature/humidity/aqi/pressure can be toggled.
    """
    _check_access(current_user, user_id)

    result = db.table("user_alert_subscriptions").update({
        "temperature": body.temperature,
        "humidity": body.humidity,
        "aqi": body.aqi,
        "pressure": body.pressure,
        "updated_by": current_user.get("sub"),
        "updated_at": "NOW()",
    }).eq("user_id", user_id).eq("sensor_id", sensor_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found — use POST to create it first"
        )

    return result.data[0]


@router.delete("/{user_id}/{sensor_id}", status_code=200)
async def delete_subscription(
    user_id: str,
    sensor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a user's alert subscription for a sensor."""
    _check_access(current_user, user_id)

    result = db.table("user_alert_subscriptions").delete()\
        .eq("user_id", user_id)\
        .eq("sensor_id", sensor_id)\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {"message": "Subscription removed", "user_id": user_id, "sensor_id": sensor_id}
