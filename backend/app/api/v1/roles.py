from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.models.role import Permission, Role, RolePermission
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.role import (
    PermissionResponse,
    RoleCreate,
    RoleListResponse,
    RoleMatrixEntry,
    RoleMatrixResponse,
    RoleMatrixUpdate,
    RolePermissionsUpdate,
    RoleResponse,
    RoleUpdate,
)

router = APIRouter()


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.view"))],
):
    """List all roles."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .order_by(Role.name)
    )
    roles = result.scalars().all()
    return [RoleResponse.model_validate(r) for r in roles]


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Create a new role."""
    # Check if name already exists
    existing = await db.execute(select(Role).where(Role.name == role_data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role with this name already exists",
        )

    role = Role(name=role_data.name, description=role_data.description)
    db.add(role)
    await db.flush()

    # Assign permissions
    for perm_id in role_data.permission_ids:
        db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    await db.commit()
    await db.refresh(role, ["permissions"])

    return RoleResponse.model_validate(role)


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.view"))],
):
    """Get a specific role by ID."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return RoleResponse.model_validate(role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Update a role."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system role",
        )

    # Check name uniqueness if changing
    if role_data.name and role_data.name != role.name:
        existing = await db.execute(
            select(Role).where(Role.name == role_data.name, Role.id != role_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Role with this name already exists",
            )

    # Update fields
    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)

    await db.commit()
    await db.refresh(role, ["permissions"])

    return RoleResponse.model_validate(role)


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Delete a role."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system role",
        )

    await db.delete(role)
    await db.commit()

    return {"message": "Role deleted successfully"}


@router.put("/{role_id}/permissions", response_model=RoleResponse)
async def update_role_permissions(
    role_id: int,
    permissions_data: RolePermissionsUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Update role permissions."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    # Remove existing permissions
    await db.execute(
        RolePermission.__table__.delete().where(RolePermission.role_id == role_id)
    )

    # Add new permissions
    for perm_id in permissions_data.permission_ids:
        # Verify permission exists
        perm = await db.execute(select(Permission).where(Permission.id == perm_id))
        if not perm.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with id {perm_id} not found",
            )
        db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    await db.commit()
    await db.refresh(role, ["permissions"])

    return RoleResponse.model_validate(role)


@router.get("/permissions/all", response_model=list[PermissionResponse])
async def list_permissions(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("users.view"))],
):
    """List all permissions."""
    result = await db.execute(select(Permission).order_by(Permission.category, Permission.code))
    permissions = result.scalars().all()
    return [PermissionResponse.model_validate(p) for p in permissions]


@router.get("/permissions/matrix", response_model=RoleMatrixResponse)
async def get_permissions_matrix(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Get the roles and permissions matrix."""
    # Get all roles with their permissions
    roles_result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .order_by(Role.name)
    )
    roles = roles_result.scalars().all()

    # Get all permissions
    perms_result = await db.execute(
        select(Permission).order_by(Permission.category, Permission.code)
    )
    permissions = perms_result.scalars().all()

    # Build matrix
    role_entries = []
    for role in roles:
        role_entries.append(
            RoleMatrixEntry(
                role_id=role.id,
                role_name=role.name,
                permissions=[p.id for p in role.permissions],
            )
        )

    return RoleMatrixResponse(
        roles=role_entries,
        permissions=[PermissionResponse.model_validate(p) for p in permissions],
    )


@router.put("/permissions/matrix", response_model=RoleMatrixResponse)
async def update_permissions_matrix(
    matrix_data: list[RoleMatrixUpdate],
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("settings.roles_matrix"))],
):
    """Update the roles and permissions matrix."""
    for update in matrix_data:
        # Get role
        role_result = await db.execute(select(Role).where(Role.id == update.role_id))
        role = role_result.scalar_one_or_none()
        if not role:
            continue

        # Remove existing permissions
        await db.execute(
            RolePermission.__table__.delete().where(RolePermission.role_id == role.id)
        )

        # Add new permissions
        for perm_id in update.permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=perm_id))

    await db.commit()

    # Return updated matrix
    return await get_permissions_matrix(db, current_user)
