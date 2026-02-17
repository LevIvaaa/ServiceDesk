from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.models.operator import Operator
from app.models.station import Station, StationPort
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.station import (
    StationCreate,
    StationListResponse,
    StationPortCreate,
    StationPortResponse,
    StationPortUpdate,
    StationResponse,
    StationUpdate,
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse[StationListResponse])
async def list_stations(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.view"))],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    operator_id: Optional[int] = None,
    city: Optional[str] = None,
    station_status: Optional[str] = None,
    language: str = Query("uk"),
):
    """List all stations with pagination and filters."""
    query = select(Station).options(selectinload(Station.operator))

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Station.station_number.ilike(search_filter))
            | (Station.station_id.ilike(search_filter))
            | (Station.external_id.ilike(search_filter))
            | (Station.name.ilike(search_filter))
            | (Station.address.ilike(search_filter))
        )
    if operator_id is not None:
        query = query.where(Station.operator_id == operator_id)
    if city:
        query = query.where(Station.city.ilike(f"%{city}%"))
    if station_status:
        query = query.where(Station.status == station_status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page).order_by(Station.station_id)

    result = await db.execute(query)
    stations = result.scalars().all()
    
    # Apply translations
    items = []
    for station in stations:
        station_dict = {
            "id": station.id,
            "station_id": station.station_id,
            "station_number": station.station_number,
            "external_id": station.external_id,
            "name": station.name_en if language == "en" and station.name_en else station.name,
            "operator": station.operator,
            "address": station.address_en if language == "en" and station.address_en else station.address,
            "city": station.city_en if language == "en" and station.city_en else station.city,
            "model": station.model,
            "status": station.status,
        }
        items.append(StationListResponse(**station_dict))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 0,
    )


@router.get("/search")
async def search_stations(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.view"))],
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    language: str = Query("uk"),
):
    """Search stations by ID or name (for autocomplete). Empty query returns all stations up to limit."""
    query = select(Station).options(selectinload(Station.operator), selectinload(Station.ports))

    if q:
        query = query.where(
            (Station.station_id.ilike(f"%{q}%"))
            | (Station.external_id.ilike(f"%{q}%"))
            | (Station.name.ilike(f"%{q}%"))
        )

    query = query.order_by(Station.station_id).limit(limit)
    result = await db.execute(query)
    stations = result.scalars().all()
    
    # Apply translations
    items = []
    for station in stations:
        station_dict = {
            "id": station.id,
            "station_id": station.station_id,
            "external_id": station.external_id,
            "name": station.name_en if language == "en" and station.name_en else station.name,
            "operator_id": station.operator_id,
            "operator": station.operator,
            "address": station.address_en if language == "en" and station.address_en else station.address,
            "city": station.city_en if language == "en" and station.city_en else station.city,
            "region": station.region_en if language == "en" and station.region_en else station.region,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "model": station.model,
            "manufacturer": station.manufacturer,
            "firmware_version": station.firmware_version,
            "installation_date": station.installation_date,
            "last_maintenance_date": station.last_maintenance_date,
            "status": station.status,
            "ports": station.ports,
            "created_at": station.created_at,
            "updated_at": station.updated_at,
        }
        items.append(StationResponse(**station_dict))
    
    return items


@router.post("", response_model=StationResponse, status_code=status.HTTP_201_CREATED)
async def create_station(
    station_data: StationCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.create"))],
):
    """Create a new station."""
    # Check if station ID already exists
    existing = await db.execute(
        select(Station).where(Station.station_id == station_data.station_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Station with this ID already exists",
        )

    # Verify operator exists
    operator = await db.execute(
        select(Operator).where(Operator.id == station_data.operator_id)
    )
    if not operator.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operator not found",
        )

    # Create station
    ports_data = station_data.ports
    station_dict = station_data.model_dump(exclude={"ports"})
    station = Station(**station_dict)
    db.add(station)
    await db.flush()

    # Create ports
    for port_data in ports_data:
        port = StationPort(station_id=station.id, **port_data.model_dump())
        db.add(port)

    await db.commit()
    await db.refresh(station, ["operator", "ports"])

    return StationResponse.model_validate(station)


@router.get("/{station_id}", response_model=StationResponse)
async def get_station(
    station_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.view"))],
    language: str = Query("uk"),
):
    """Get a specific station by ID."""
    result = await db.execute(
        select(Station)
        .options(selectinload(Station.operator), selectinload(Station.ports))
        .where(Station.id == station_id)
    )
    station = result.scalar_one_or_none()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )
    
    # Apply translations
    station_dict = {
        "id": station.id,
        "station_id": station.station_id,
        "station_number": station.station_number,
        "external_id": station.external_id,
        "name": station.name_en if language == "en" and station.name_en else station.name,
        "operator_id": station.operator_id,
        "operator": station.operator,
        "address": station.address_en if language == "en" and station.address_en else station.address,
        "city": station.city_en if language == "en" and station.city_en else station.city,
        "region": station.region_en if language == "en" and station.region_en else station.region,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "model": station.model,
        "manufacturer": station.manufacturer,
        "firmware_version": station.firmware_version,
        "installation_date": station.installation_date,
        "last_maintenance_date": station.last_maintenance_date,
        "status": station.status,
        "ports": station.ports,
        "created_at": station.created_at,
        "updated_at": station.updated_at,
    }

    return StationResponse(**station_dict)


@router.put("/{station_id}", response_model=StationResponse)
async def update_station(
    station_id: int,
    station_data: StationUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.edit"))],
):
    """Update a station."""
    result = await db.execute(
        select(Station)
        .options(selectinload(Station.operator), selectinload(Station.ports))
        .where(Station.id == station_id)
    )
    station = result.scalar_one_or_none()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    # Check station_id uniqueness if changing
    if station_data.station_id and station_data.station_id != station.station_id:
        existing = await db.execute(
            select(Station).where(
                Station.station_id == station_data.station_id,
                Station.id != station_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Station with this ID already exists",
            )

    # Update fields
    update_data = station_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(station, field, value)

    await db.commit()
    await db.refresh(station, ["operator", "ports"])

    return StationResponse.model_validate(station)


@router.delete("/{station_id}")
async def delete_station(
    station_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.delete"))],
):
    """Delete a station (soft delete by setting status)."""
    result = await db.execute(select(Station).where(Station.id == station_id))
    station = result.scalar_one_or_none()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    station.status = "decommissioned"
    await db.commit()

    return {"message": "Station decommissioned successfully"}


@router.get("/{station_id}/ports", response_model=list[StationPortResponse])
async def get_station_ports(
    station_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.view"))],
):
    """Get all ports for a station."""
    # Check station exists
    station_result = await db.execute(select(Station).where(Station.id == station_id))
    if not station_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    result = await db.execute(
        select(StationPort)
        .where(StationPort.station_id == station_id)
        .order_by(StationPort.port_number)
    )
    ports = result.scalars().all()

    return [StationPortResponse.model_validate(p) for p in ports]


@router.post("/{station_id}/ports", response_model=StationPortResponse, status_code=status.HTTP_201_CREATED)
async def create_station_port(
    station_id: int,
    port_data: StationPortCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.edit"))],
):
    """Add a port to a station."""
    # Check station exists
    station_result = await db.execute(select(Station).where(Station.id == station_id))
    station = station_result.scalar_one_or_none()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    # Check port number doesn't exist
    existing = await db.execute(
        select(StationPort).where(
            StationPort.station_id == station_id,
            StationPort.port_number == port_data.port_number,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Port with this number already exists",
        )

    port = StationPort(station_id=station_id, **port_data.model_dump())
    db.add(port)

    await db.commit()
    await db.refresh(port)

    return StationPortResponse.model_validate(port)


@router.put("/{station_id}/ports/{port_id}", response_model=StationPortResponse)
async def update_station_port(
    station_id: int,
    port_id: int,
    port_data: StationPortUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.edit"))],
):
    """Update a station port."""
    result = await db.execute(
        select(StationPort).where(
            StationPort.id == port_id,
            StationPort.station_id == station_id,
        )
    )
    port = result.scalar_one_or_none()

    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Port not found",
        )

    # Update fields
    update_data = port_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(port, field, value)

    await db.commit()
    await db.refresh(port)

    return StationPortResponse.model_validate(port)


@router.delete("/{station_id}/ports/{port_id}")
async def delete_station_port(
    station_id: int,
    port_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("stations.edit"))],
):
    """Delete a station port."""
    result = await db.execute(
        select(StationPort).where(
            StationPort.id == port_id,
            StationPort.station_id == station_id,
        )
    )
    port = result.scalar_one_or_none()

    if not port:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Port not found",
        )

    await db.delete(port)
    await db.commit()

    return {"message": "Port deleted successfully"}
