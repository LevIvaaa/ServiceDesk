from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, CurrentAdminUser, DbSession
from app.models.incident_type import IncidentType
from app.schemas.incident_type import IncidentTypeCreate, IncidentTypeUpdate, IncidentTypeResponse

router = APIRouter()


@router.get("/", response_model=list[IncidentTypeResponse])
async def list_incident_types(
    db: DbSession,
    current_user: CurrentUser,
    active_only: bool = Query(False),
):
    """List all incident types. If active_only=True, return only active ones."""
    query = select(IncidentType).order_by(IncidentType.name)
    if active_only:
        query = query.where(IncidentType.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IncidentTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_incident_type(
    data: IncidentTypeCreate,
    db: DbSession,
    current_user: CurrentAdminUser,
):
    """Create a new incident type (admin only)."""
    # Check for duplicate name
    existing = await db.execute(
        select(IncidentType).where(func.lower(IncidentType.name) == data.name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Тип інциденту з такою назвою вже існує")

    incident_type = IncidentType(name=data.name)
    db.add(incident_type)
    await db.commit()
    await db.refresh(incident_type)
    return incident_type


@router.put("/{incident_type_id}", response_model=IncidentTypeResponse)
async def update_incident_type(
    incident_type_id: int,
    data: IncidentTypeUpdate,
    db: DbSession,
    current_user: CurrentAdminUser,
):
    """Update an incident type (admin only)."""
    result = await db.execute(select(IncidentType).where(IncidentType.id == incident_type_id))
    incident_type = result.scalar_one_or_none()
    if not incident_type:
        raise HTTPException(status_code=404, detail="Тип інциденту не знайдено")

    if data.name is not None:
        # Check for duplicate name
        existing = await db.execute(
            select(IncidentType).where(
                func.lower(IncidentType.name) == data.name.lower(),
                IncidentType.id != incident_type_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Тип інциденту з такою назвою вже існує")
        incident_type.name = data.name

    if data.is_active is not None:
        incident_type.is_active = data.is_active

    await db.commit()
    await db.refresh(incident_type)
    return incident_type


@router.delete("/{incident_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident_type(
    incident_type_id: int,
    db: DbSession,
    current_user: CurrentAdminUser,
):
    """Delete an incident type (admin only)."""
    result = await db.execute(select(IncidentType).where(IncidentType.id == incident_type_id))
    incident_type = result.scalar_one_or_none()
    if not incident_type:
        raise HTTPException(status_code=404, detail="Тип інциденту не знайдено")

    await db.delete(incident_type)
    await db.commit()
