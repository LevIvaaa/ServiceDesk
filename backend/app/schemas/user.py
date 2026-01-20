from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    is_admin: bool = False
    role_ids: list[int] = []


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserRolesUpdate(BaseModel):
    role_ids: list[int]


class RoleShort(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DepartmentShort(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str]
    is_active: bool
    is_admin: bool
    department_id: Optional[int]
    department: Optional[DepartmentShort]
    roles: list[RoleShort]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    is_admin: bool
    department: Optional[DepartmentShort]
    created_at: datetime

    class Config:
        from_attributes = True


class UserNotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    telegram_enabled: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    notify_ticket_created: Optional[bool] = None
    notify_ticket_assigned: Optional[bool] = None
    notify_ticket_status_changed: Optional[bool] = None
    notify_ticket_commented: Optional[bool] = None
    notify_ticket_sla_warning: Optional[bool] = None
    notify_ticket_escalated: Optional[bool] = None
    language: Optional[str] = None


class UserNotificationSettingsResponse(BaseModel):
    email_enabled: bool
    telegram_enabled: bool
    telegram_chat_id: Optional[str]
    notify_ticket_created: bool
    notify_ticket_assigned: bool
    notify_ticket_status_changed: bool
    notify_ticket_commented: bool
    notify_ticket_sla_warning: bool
    notify_ticket_escalated: bool
    language: str

    class Config:
        from_attributes = True


class CurrentUserResponse(UserResponse):
    permissions: list[str]
