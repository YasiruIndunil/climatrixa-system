from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings

settings = get_settings()

# HTTPBearer scheme — shows a simple "Bearer token" input in Swagger
# instead of the confusing OAuth2 username/password/client_id form.
# Usage in Swagger: click Authorize → paste your token from /auth/login
bearer_scheme = HTTPBearer(
    scheme_name="Bearer Token",
    description="Paste the access_token returned by POST /auth/login"
)


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt directly (avoids passlib/bcrypt
    version-detection issues seen with passlib 1.7.4 + bcrypt 4.x)."""
    pwd_bytes = password.encode("utf-8")[:72]  # bcrypt's 72-byte limit
    hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check if a plain password matches the stored bcrypt hash."""
    plain_bytes = plain.encode("utf-8")[:72]
    return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT token.
    data = {"sub": user_id, "role": "admin" | "public"}
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """FastAPI dependency — inject into any route that needs auth."""
    return decode_token(credentials.credentials)


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency — only allows users with role='admin'."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
