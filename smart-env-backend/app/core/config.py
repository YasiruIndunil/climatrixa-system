from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Smart Environmental Monitoring API"
    app_version: str = "1.0.0"
    debug: bool = True
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,https://climatrixa-system.vercel.app"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # MQTT (HiveMQ)
    mqtt_broker_host: str
    mqtt_broker_port: int = 8883
    mqtt_username: str
    mqtt_password: str
    mqtt_topic_prefix: str = "smartenv"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings — reads .env once and reuses the object.
    Call: from app.core.config import get_settings; s = get_settings()
    """
    return Settings()
