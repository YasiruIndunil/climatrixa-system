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


class SensorResponse(BaseModel):
    id: str
    name: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    industry_profile: Optional[str]
    is_active: bool
    created_at: datetime


# ── Reading Schemas ────────────────────────────────────────────────────────────

class ReadingCreate(BaseModel):
    """
    This is what the ESP32 sends to POST /readings
    The ESP32 authenticates with a device API key (not a JWT).
    """
    sensor_id: str
    temperature: float = Field(description="Celsius", example=28.5)
    humidity: float = Field(description="Relative humidity %", example=62.3)
    aqi: float = Field(description="Air Quality Index 0-500", example=45.0)
    pressure: Optional[float] = Field(None, description="hPa", example=1013.2)
    api_key: str = Field(description="Device API key configured on the ESP32")


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
