from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IncidentTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class IncidentTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None


class IncidentTypeResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
