from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    public = "public"


class AlertType(str, Enum):
    temperature_high = "temperature_high"
    temperature_low = "temperature_low"
    humidity_high = "humidity_high"
    humidity_low = "humidity_low"
    aqi_high = "aqi_high"


# ── Auth Schemas ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    full_name: str
    role: UserRole = UserRole.public


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    """User changes their own password — requires the old password."""
    old_password: str
    new_password: str = Field(min_length=8, description="Minimum 8 characters")


class ResetPasswordRequest(BaseModel):
    """Admin resets another user's password — no old password required."""
    new_password: str = Field(min_length=8, description="Minimum 8 characters")


class UpdateProfileRequest(BaseModel):
    """User updates their own profile (currently: full name only)."""
    full_name: str


class UpdateUserRoleRequest(BaseModel):
    """Admin changes another user's role."""
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


# ── Sensor Schemas ─────────────────────────────────────────────────────────────

class SensorCreate(BaseModel):
    name: str = Field(example="Factory Floor A")
    location: str = Field(example="Spice Factory, Colombo")
    latitude: Optional[float] = Field(None, example=6.9271)
    longitude: Optional[float] = Field(None, example=79.8612)
    industry_profile: Optional[str] = Field(
        None, example="spice_factory",
        description="One of: general, spice_factory, supermarket, hospital, office"
    )


class SensorUpdate(BaseModel):
    """All fields optional — only provided fields are updated (PATCH semantics)."""
    name: Optional[str] = Field(None, example="Factory Floor A - Renamed")
    location: Optional[str] = Field(None, example="Spice Factory, Galle")
    industry_profile: Optional[str] = Field(
        None, example="supermarket",
        description="One of: general, spice_factory, supermarket, hospital, office"
    )
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None
    mac_address: Optional[str] = None


class SensorResponse(BaseModel):
    id: str
    name: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    industry_profile: Optional[str]
    is_active: bool
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    


# ── Reading Schemas ────────────────────────────────────────────────────────────
class ReadingCreate(BaseModel):
    """HTTP POST fallback endpoint for ESP32 readings."""
    brand_key: str = Field(description="Climatrixa brand key — proves device is our product")
    mac: str = Field(description="ESP32 MAC address — identifies which sensor")
    temperature: float = Field(description="Celsius", example=28.5)
    humidity: float = Field(description="Relative humidity %", example=62.3)
    aqi: float = Field(description="Air Quality Index 0-500", example=45.0)
    pressure: Optional[float] = Field(None, description="hPa", example=1013.2)
    recorded_at: Optional[str] = Field(None, description="ISO8601 UTC timestamp from ESP32 NTP")


class ReadingResponse(BaseModel):
    id: str
    sensor_id: str
    temperature: float
    humidity: float
    aqi: float
    pressure: Optional[float]
    recorded_at: datetime


class LatestReadingsResponse(BaseModel):
    sensor_id: str
    sensor_name: str
    location: str
    temperature: float
    humidity: float
    aqi: float
    pressure: Optional[float]
    aqi_status: str      # Good / Moderate / Unhealthy / Hazardous
    recorded_at: datetime
    recorded_at_local: Optional[str] = None    # UTC+5:30 ISO string
    recorded_at_display: Optional[str] = None  # 28 Jun 2026, 02:00 PM


# ── Prediction Schemas ─────────────────────────────────────────────────────────

class PredictionPoint(BaseModel):
    hours_ahead: int
    temperature: float
    humidity: float
    aqi: float


class PredictionResponse(BaseModel):
    sensor_id: str
    generated_at: datetime
    forecast: List[PredictionPoint]
    anomaly_detected: bool
    anomaly_description: Optional[str] = None


# ── Alert Schemas ──────────────────────────────────────────────────────────────

class AlertRuleCreate(BaseModel):
    sensor_id: str
    alert_type: AlertType
    threshold_value: float = Field(example=35.0)
    notify_email: Optional[EmailStr] = None


class AlertRuleResponse(BaseModel):
    id: str
    sensor_id: str
    alert_type: str
    threshold_value: float
    notify_email: Optional[str]
    is_active: bool
    created_at: datetime


class AlertEventResponse(BaseModel):
    id: str
    sensor_id: str
    alert_type: str
    actual_value: float
    threshold_value: float
    message: str
    triggered_at: datetime
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None


# ── User sensor access schemas ─────────────────────────────────────────────────

class SensorAccessResponse(BaseModel):
    id: str
    user_id: str
    sensor_id: str
    assigned_at: str

    class Config:
        from_attributes = True


# ── Alert subscription schemas ─────────────────────────────────────────────────

class SubscriptionUpdate(BaseModel):
    """Update which parameters a user is subscribed to for a specific sensor."""
    temperature: bool = True
    humidity: bool = True
    aqi: bool = True
    pressure: bool = True


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    sensor_id: str
    temperature: bool
    humidity: bool
    aqi: bool
    pressure: bool
    updated_at: str

    class Config:
        from_attributes = True
