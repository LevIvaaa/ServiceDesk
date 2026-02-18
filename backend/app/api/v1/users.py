from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserNotificationSettings
from app.models.role import Role
from app.schemas.common import PaginatedResponse
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserNotificationSettingsResponse,
    UserNotificationSettingsUpdate,
    UserResponse,
    UserRolesUpdate,
    UserUpdate,
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UserListResponse])
async def list_users(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.view"))],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    lang: Optional[str] = Query(None, description="Language code (en, uk)"),
):
    """List all users with pagination and filters."""
    query = select(User).options(selectinload(User.department), selectinload(User.roles))

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_filter))
            | (User.first_name.ilike(search_filter))
            | (User.last_name.ilike(search_filter))
        )
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page).order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    # Build response with translated names
    items = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name_en if lang == "en" and user.first_name_en else user.first_name,
            "last_name": user.last_name_en if lang == "en" and user.last_name_en else user.last_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "department_id": user.department_id,
            "department": {
                "id": user.department.id,
                "name": user.department.name_en if lang == "en" and user.department.name_en else user.department.name
            } if user.department else None,
            "roles": [{"id": r.id, "name": r.name} for r in user.roles],
            "created_at": user.created_at,
        }
        items.append(UserListResponse(**user_dict))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.create"))],
):
    """Create a new user."""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        department_id=user_data.department_id,
        is_admin=user_data.is_admin,
    )
    db.add(user)
    await db.flush()

    # Assign roles
    if user_data.role_ids:
        for role_id in user_data.role_ids:
            db.add(UserRole(user_id=user.id, role_id=role_id))

    # Create notification settings
    notification_settings = UserNotificationSettings(user_id=user.id)
    db.add(notification_settings)

    await db.commit()
    await db.refresh(user, ["roles", "department"])

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: DbSession,
    current_user: CurrentUser,
):
    """Get current user profile."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Update current user profile."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    # Update allowed fields only (not admin, not roles)
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.phone is not None:
        user.phone = user_data.phone

    await db.commit()
    await db.refresh(user, ["roles", "department"])

    return UserResponse.model_validate(user)


@router.get("/me/notifications", response_model=UserNotificationSettingsResponse)
async def get_my_notification_settings(
    db: DbSession,
    current_user: CurrentUser,
):
    """Get current user notification settings."""
    result = await db.execute(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings
        settings = UserNotificationSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return UserNotificationSettingsResponse.model_validate(settings)


@router.put("/me/notifications", response_model=UserNotificationSettingsResponse)
async def update_my_notification_settings(
    settings_data: UserNotificationSettingsUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Update current user notification settings."""
    result = await db.execute(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserNotificationSettings(user_id=current_user.id)
        db.add(settings)
        await db.flush()

    # Update fields
    update_data = settings_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    return UserNotificationSettingsResponse.model_validate(settings)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.view"))],
):
    """Get a specific user by ID."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.edit"))],
):
    """Update a user."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check email uniqueness if changing
    if user_data.email and user_data.email != user.email:
        existing = await db.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists",
            )

    # Update fields (excluding role_ids which needs special handling)
    update_data = user_data.model_dump(exclude_unset=True, exclude={'role_ids'})
    for field, value in update_data.items():
        setattr(user, field, value)

    # Update roles if provided
    if user_data.role_ids is not None:
        # Delete existing roles
        await db.execute(
            delete(UserRole).where(UserRole.user_id == user_id)
        )
        
        # Add new roles
        for role_id in user_data.role_ids:
            user_role = UserRole(user_id=user_id, role_id=role_id)
            db.add(user_role)

    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one()

    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.delete"))],
):
    """Permanently delete a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    # Permanently delete the user
    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


@router.put("/{user_id}/password")
async def reset_user_password(
    user_id: int,
    new_password: str,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.edit"))],
):
    """Reset user password (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    user.password_hash = get_password_hash(new_password)
    await db.commit()

    return {"message": "Password reset successfully"}


@router.put("/{user_id}/roles", response_model=UserResponse)
async def update_user_roles(
    user_id: int,
    roles_data: UserRolesUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.manage_roles"))],
):
    """Update user roles."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Remove existing roles
    await db.execute(
        UserRole.__table__.delete().where(UserRole.user_id == user_id)
    )

    # Add new roles
    for role_id in roles_data.role_ids:
        # Verify role exists
        role = await db.execute(select(Role).where(Role.id == role_id))
        if not role.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with id {role_id} not found",
            )
        db.add(UserRole(user_id=user.id, role_id=role_id))

    await db.commit()
    await db.refresh(user, ["roles", "department"])

    return UserResponse.model_validate(user)


@router.get("/{user_id}/notification-settings", response_model=UserNotificationSettingsResponse)
async def get_user_notification_settings(
    user_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get user notification settings."""
    # Users can only view their own settings unless admin
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other user's notification settings",
        )

    result = await db.execute(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings
        settings = UserNotificationSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return UserNotificationSettingsResponse.model_validate(settings)


@router.put("/{user_id}/notification-settings", response_model=UserNotificationSettingsResponse)
async def update_user_notification_settings(
    user_id: int,
    settings_data: UserNotificationSettingsUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Update user notification settings."""
    # Users can only update their own settings unless admin
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's notification settings",
        )

    result = await db.execute(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserNotificationSettings(user_id=user_id)
        db.add(settings)
        await db.flush()

    # Update fields
    update_data = settings_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    return UserNotificationSettingsResponse.model_validate(settings)
