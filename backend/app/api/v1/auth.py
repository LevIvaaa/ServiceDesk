from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.core.permissions import get_user_permissions
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    Token,
)
from app.schemas.user import CurrentUserResponse, UserResponse

from app.core.rate_limit import limiter

router = APIRouter()


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, login_data: LoginRequest, db: DbSession):
    """Authenticate user and return JWT tokens."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: DbSession):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
async def logout():
    """Logout user (client should discard tokens)."""
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(current_user: CurrentUser, db: DbSession):
    """Get current user information with permissions."""
    permissions = await get_user_permissions(current_user, db)
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        department_id=current_user.department_id,
        department=current_user.department,
        roles=current_user.roles,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        permissions=permissions,
    )


@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Change current user's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = get_password_hash(request.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}
