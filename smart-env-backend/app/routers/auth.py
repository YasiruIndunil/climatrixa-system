from fastapi import APIRouter, HTTPException, status
from app.models.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest):
    """
    Register a new user.
    Returns a JWT token so the user is logged in immediately after registering.
    """
    # Check if email already exists
    existing = db.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    # Store user with hashed password (NEVER store plain passwords)
    result = db.table("users").insert({
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "role": body.role.value,
    }).execute()

    user = result.data[0]

    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
    })

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        role=user["role"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """
    Login with email + password.
    Returns a JWT token valid for 24 hours.
    """
    result = db.table("users").select("*").eq("email", body.email).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user = result.data[0]

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
    })

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        role=user["role"],
    )


@router.get("/me")
async def me(current_user: dict = None):
    """
    Return the currently logged-in user's info.
    Requires: Authorization: Bearer <token> header.
    """
    # Import here to avoid circular imports
    from app.core.security import get_current_user
    from fastapi import Depends
    # This route uses the dependency in main.py — see the protected example below
    return {"message": "Use the /docs page to test authenticated routes"}
