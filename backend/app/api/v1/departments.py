from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.models.department import Department
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.schemas.user import UserListResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DepartmentListResponse])
async def list_departments(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.view"))],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """List all departments with pagination."""
    query = select(Department)

    if search:
        query = query.where(Department.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.where(Department.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page).order_by(Department.name)

    result = await db.execute(query)
    departments = result.scalars().all()

    # Get users count for each department
    items = []
    for dept in departments:
        count_result = await db.execute(
            select(func.count()).where(User.department_id == dept.id)
        )
        users_count = count_result.scalar()
        items.append(
            DepartmentListResponse(
                id=dept.id,
                name=dept.name,
                description=dept.description,
                is_active=dept.is_active,
                users_count=users_count,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/all", response_model=list[DepartmentListResponse])
async def list_all_departments(
    db: DbSession,
    current_user: CurrentUser,
):
    """List all active departments without pagination (for dropdowns)."""
    result = await db.execute(
        select(Department)
        .where(Department.is_active == True)
        .order_by(Department.name)
    )
    departments = result.scalars().all()

    items = []
    for dept in departments:
        count_result = await db.execute(
            select(func.count()).where(User.department_id == dept.id)
        )
        users_count = count_result.scalar()
        items.append(
            DepartmentListResponse(
                id=dept.id,
                name=dept.name,
                description=dept.description,
                is_active=dept.is_active,
                users_count=users_count,
            )
        )

    return items


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_data: DepartmentCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.create"))],
):
    """Create a new department."""
    # Check if name already exists
    existing = await db.execute(
        select(Department).where(Department.name == dept_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department with this name already exists",
        )

    department = Department(**dept_data.model_dump())
    db.add(department)
    await db.commit()
    await db.refresh(department, ["head_user"])

    return DepartmentResponse.model_validate(department)


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.view"))],
):
    """Get a specific department by ID."""
    result = await db.execute(
        select(Department)
        .options(selectinload(Department.head_user))
        .where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    return DepartmentResponse.model_validate(department)


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    dept_data: DepartmentUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.edit"))],
):
    """Update a department."""
    result = await db.execute(
        select(Department)
        .options(selectinload(Department.head_user))
        .where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    # Check name uniqueness if changing
    if dept_data.name and dept_data.name != department.name:
        existing = await db.execute(
            select(Department).where(
                Department.name == dept_data.name,
                Department.id != department_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department with this name already exists",
            )

    # Update fields
    update_data = dept_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(department, field, value)

    await db.commit()
    await db.refresh(department, ["head_user"])

    return DepartmentResponse.model_validate(department)


@router.delete("/{department_id}")
async def delete_department(
    department_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.delete"))],
):
    """Deactivate a department."""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    department.is_active = False
    await db.commit()

    return {"message": "Department deactivated successfully"}


@router.get("/{department_id}/users", response_model=list[UserListResponse])
async def get_department_users(
    department_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("departments.view"))],
):
    """Get all users in a department."""
    # Check department exists
    dept_result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    if not dept_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .where(User.department_id == department_id, User.is_active == True)
        .order_by(User.last_name, User.first_name)
    )
    users = result.scalars().all()

    return [UserListResponse.model_validate(u) for u in users]
