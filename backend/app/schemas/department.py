from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    head_user_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    head_user_id: Optional[int] = None
    is_active: Optional[bool] = None


class HeadUserShort(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    class Config:
        from_attributes = True


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    head_user_id: Optional[int]
    head_user: Optional[HeadUserShort]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    users_count: int = 0

    class Config:
        from_attributes = True
