from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.models.operator import Operator
from app.models.station import Station
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.operator import (
    OperatorCreate,
    OperatorListResponse,
    OperatorResponse,
    OperatorUpdate,
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse[OperatorListResponse])
async def list_operators(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("operators.view"))],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """List all operators with pagination."""
    query = select(Operator)

    if search:
        query = query.where(
            Operator.name.ilike(f"%{search}%") | Operator.code.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.where(Operator.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page).order_by(Operator.name)

    result = await db.execute(query)
    operators = result.scalars().all()

    # Get stations count for each operator
    items = []
    for op in operators:
        count_result = await db.execute(
            select(func.count()).where(Station.operator_id == op.id)
        )
        stations_count = count_result.scalar()
        items.append(
            OperatorListResponse(
                id=op.id,
                name=op.name,
                code=op.code,
                contact_email=op.contact_email,
                contact_phone=op.contact_phone,
                is_active=op.is_active,
                stations_count=stations_count,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 0,
    )


@router.post("", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
async def create_operator(
    operator_data: OperatorCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("operators.create"))],
):
    """Create a new operator."""
    # Check if code already exists
    existing = await db.execute(
        select(Operator).where(Operator.code == operator_data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operator with this code already exists",
        )

    operator = Operator(**operator_data.model_dump())
    db.add(operator)
    await db.commit()
    await db.refresh(operator)

    return OperatorResponse(
        id=operator.id,
        name=operator.name,
        code=operator.code,
        contact_email=operator.contact_email,
        contact_phone=operator.contact_phone,
        api_endpoint=operator.api_endpoint,
        notes=operator.notes,
        is_active=operator.is_active,
        stations_count=0,
        created_at=operator.created_at,
        updated_at=operator.updated_at,
    )


@router.get("/{operator_id}", response_model=OperatorResponse)
async def get_operator(
    operator_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("operators.view"))],
):
    """Get a specific operator by ID."""
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    operator = result.scalar_one_or_none()

    if not operator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operator not found",
        )

    # Get stations count
    count_result = await db.execute(
        select(func.count()).where(Station.operator_id == operator.id)
    )
    stations_count = count_result.scalar()

    return OperatorResponse(
        id=operator.id,
        name=operator.name,
        code=operator.code,
        contact_email=operator.contact_email,
        contact_phone=operator.contact_phone,
        api_endpoint=operator.api_endpoint,
        notes=operator.notes,
        is_active=operator.is_active,
        stations_count=stations_count,
        created_at=operator.created_at,
        updated_at=operator.updated_at,
    )


@router.put("/{operator_id}", response_model=OperatorResponse)
async def update_operator(
    operator_id: int,
    operator_data: OperatorUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("operators.edit"))],
):
    """Update an operator."""
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    operator = result.scalar_one_or_none()

    if not operator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operator not found",
        )

    # Update fields
    update_data = operator_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(operator, field, value)

    await db.commit()
    await db.refresh(operator)

    # Get stations count
    count_result = await db.execute(
        select(func.count()).where(Station.operator_id == operator.id)
    )
    stations_count = count_result.scalar()

    return OperatorResponse(
        id=operator.id,
        name=operator.name,
        code=operator.code,
        contact_email=operator.contact_email,
        contact_phone=operator.contact_phone,
        api_endpoint=operator.api_endpoint,
        notes=operator.notes,
        is_active=operator.is_active,
        stations_count=stations_count,
        created_at=operator.created_at,
        updated_at=operator.updated_at,
    )


@router.delete("/{operator_id}")
async def delete_operator(
    operator_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("operators.delete"))],
):
    """Deactivate an operator."""
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    operator = result.scalar_one_or_none()

    if not operator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operator not found",
        )

    operator.is_active = False
    await db.commit()

    return {"message": "Operator deactivated successfully"}
