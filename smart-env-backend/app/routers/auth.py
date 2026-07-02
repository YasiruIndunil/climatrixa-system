from typing import List

from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    ChangePasswordRequest, ResetPasswordRequest,
    UpdateProfileRequest, UpdateUserRoleRequest,
)
from app.core.security import hash_password, verify_password, create_access_token, get_current_user, require_admin
from app.core.database import db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/users", tags=["Auth"])
async def list_users(current_user: dict = Depends(require_admin)):
    """List all users — admin only"""
    result = (
        db.table("users")
        .select("id, email, full_name, role, is_active, created_at")
        .order("created_at")
        .execute()
    )
    return result.data

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    body: RegisterRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Register a new user. Admin only — users cannot self-register.
    The creating admin's ID is recorded in created_by and updated_by.
    Returns a JWT token for the newly created user.
    """
    admin_id = current_user.get("sub")
    admin_role = current_user.get("role")

    if admin_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create new user accounts"
        )

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
        "created_by": admin_id,
        "updated_by": admin_id,
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

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact an administrator."
        )

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
async def me(current_user: dict = Depends(get_current_user)):
    """
    Return the currently logged-in user's info.
    Requires: Authorization: Bearer <token> header.

    The JWT payload (set at login/register) already contains id, email,
    and role, so we decode it via get_current_user — no extra DB call
    needed for the basic info. We also fetch full_name from the database
    since it isn't stored in the token.
    """
    user_id = current_user.get("sub")

    result = db.table("users").select("id, email, full_name, role, created_at").eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return result.data[0]


@router.patch("/me/password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Change your own password.
    Requires your current password for verification, plus a new password.
    """
    user_id = current_user.get("sub")

    result = db.table("users").select("password_hash").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(body.old_password, result.data[0]["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    db.table("users").update({
        "password_hash": hash_password(body.new_password)
    }).eq("id", user_id).execute()

    return {"message": "Password changed successfully"}


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update your own profile. Currently supports updating full_name.
    """
    user_id = current_user.get("sub")

    result = db.table("users").update({
        "full_name": body.full_name,
        "updated_by": user_id,
        "updated_at": "NOW()",
    }).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return result.data[0]


@router.patch("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body: ResetPasswordRequest,
    admin: dict = Depends(require_admin)
):
    """
    Admin-only: reset another user's password without needing their old
    password. Useful for account recovery.
    """
    result = db.table("users").update({
        "password_hash": hash_password(body.new_password)
    }).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"message": "Password reset successfully", "user_id": user_id}


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UpdateUserRoleRequest,
    admin: dict = Depends(require_admin)
):
    """
    Admin-only: change another user's role (admin / public).
    """
    result = db.table("users").update({
        "role": body.role.value,
        "updated_by": admin.get("sub"),
        "updated_at": "NOW()",
    }).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return result.data[0]


@router.patch("/users/{user_id}/disable")
async def disable_user(user_id: str, admin: dict = Depends(require_admin)):
    """
    Disable a user account (admin only).
    A disabled user can no longer log in, but their data/history is preserved.
    """
    result = db.table("users").update({"is_active": False}).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {"message": "User account disabled", "user_id": user_id}


@router.patch("/users/{user_id}/enable")
async def enable_user(user_id: str, admin: dict = Depends(require_admin)):
    """
    Re-enable a previously disabled user account (admin only).
    """
    result = db.table("users").update({"is_active": True}).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {"message": "User account enabled", "user_id": user_id}
