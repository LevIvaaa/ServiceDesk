from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class StationPortBase(BaseModel):
    port_number: int = Field(..., ge=1)
    connector_type: Optional[str] = Field(None, max_length=50)
    power_kw: Optional[float] = None


class StationPortCreate(StationPortBase):
    pass


class StationPortUpdate(BaseModel):
    connector_type: Optional[str] = Field(None, max_length=50)
    power_kw: Optional[float] = None
    status: Optional[str] = Field(None, max_length=20)


class StationPortResponse(BaseModel):
    id: int
    port_number: int
    connector_type: Optional[str]
    power_kw: Optional[float]
    status: str
    last_session_at: Optional[datetime]

    class Config:
        from_attributes = True


class StationBase(BaseModel):
    station_id: str = Field(..., min_length=1, max_length=100)
    station_number: Optional[str] = Field(None, max_length=50)  # Display number from chargePoints
    external_id: Optional[str] = Field(None, max_length=100)  # Operator's station number
    name: str = Field(..., min_length=1, max_length=200)
    operator_id: int
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    model: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    firmware_version: Optional[str] = Field(None, max_length=50)
    installation_date: Optional[date] = None


class StationCreate(StationBase):
    ports: list[StationPortCreate] = []


class StationUpdate(BaseModel):
    station_id: Optional[str] = Field(None, min_length=1, max_length=100)
    station_number: Optional[str] = Field(None, max_length=50)
    external_id: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    operator_id: Optional[int] = None
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    model: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    firmware_version: Optional[str] = Field(None, max_length=50)
    installation_date: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)


class OperatorShort(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class StationResponse(BaseModel):
    id: int
    station_id: str
    station_number: Optional[str]  # Display number
    external_id: Optional[str]  # Operator's station number
    name: str
    operator_id: int
    operator: OperatorShort
    address: Optional[str]
    city: Optional[str]
    region: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    model: Optional[str]
    manufacturer: Optional[str]
    firmware_version: Optional[str]
    installation_date: Optional[date]
    last_maintenance_date: Optional[date]
    status: str
    ports: list[StationPortResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class StationListResponse(BaseModel):
    id: int
    station_id: str
    station_number: Optional[str]  # Display number
    external_id: Optional[str]  # Operator's station number
    name: str
    operator: OperatorShort
    address: Optional[str]
    city: Optional[str]
    model: Optional[str]
    status: str

    class Config:
        from_attributes = True
