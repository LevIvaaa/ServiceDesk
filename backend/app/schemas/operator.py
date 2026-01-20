from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class OperatorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20)
    api_endpoint: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    is_active: bool = True


class OperatorCreate(OperatorBase):
    pass


class OperatorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20)
    api_endpoint: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OperatorResponse(BaseModel):
    id: int
    name: str
    code: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    api_endpoint: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    stations_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OperatorListResponse(BaseModel):
    id: int
    name: str
    code: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool
    stations_count: int = 0

    class Config:
        from_attributes = True
