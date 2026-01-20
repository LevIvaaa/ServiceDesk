from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None


class RolePermissionsUpdate(BaseModel):
    permission_ids: list[int]


class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    description: Optional[str]

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system: bool
    permissions: list[PermissionResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system: bool
    permissions_count: int = 0

    class Config:
        from_attributes = True


class RoleMatrixEntry(BaseModel):
    role_id: int
    role_name: str
    permissions: list[int]  # List of permission IDs


class RoleMatrixResponse(BaseModel):
    roles: list[RoleMatrixEntry]
    permissions: list[PermissionResponse]


class RoleMatrixUpdate(BaseModel):
    role_id: int
    permission_ids: list[int]
