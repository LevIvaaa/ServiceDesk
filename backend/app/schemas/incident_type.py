from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IncidentTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class IncidentTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None


class IncidentTypeReorder(BaseModel):
    ids: list[int] = Field(..., description="Ordered list of incident type IDs")


class IncidentTypeResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True
