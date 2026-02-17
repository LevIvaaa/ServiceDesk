from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TicketBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1)
    category: str = Field(..., pattern="^(hardware|software|network|billing|other)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    station_id: Optional[int] = None
    port_number: Optional[int] = None
    reporter_name: Optional[str] = Field(None, max_length=200)
    reporter_phone: Optional[str] = Field(None, max_length=20)
    reporter_email: Optional[EmailStr] = None
    # New fields from TZ
    incident_type: Optional[str] = Field(None, max_length=100)
    port_type: Optional[str] = Field(None, max_length=50)
    contact_source: Optional[str] = Field(None, max_length=50)
    station_logs: Optional[str] = None
    vehicle: Optional[str] = Field(None, max_length=200)  # Vehicle info


class AILogAnalysis(BaseModel):
    analysis: str = ""
    error_codes: list[str] = []
    status: str = "unknown"
    recommendations: list[str] = []


class TicketCreate(TicketBase):
    assigned_user_id: Optional[int] = None
    assigned_department_id: Optional[int] = None
    ai_log_analysis: Optional[AILogAnalysis] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, pattern="^(hardware|software|network|billing|other)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    station_id: Optional[int] = None
    port_number: Optional[int] = None
    reporter_name: Optional[str] = Field(None, max_length=200)
    reporter_phone: Optional[str] = Field(None, max_length=20)
    reporter_email: Optional[EmailStr] = None


class TicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|open|in_progress|pending|resolved|closed)$")
    comment: Optional[str] = None


class TicketAssignUpdate(BaseModel):
    assigned_user_id: Optional[int] = None
    comment: Optional[str] = None


class TicketDelegateUpdate(BaseModel):
    assigned_department_id: int
    assigned_user_id: Optional[int] = None
    comment: Optional[str] = None


class UserShort(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    class Config:
        from_attributes = True


class DepartmentShort(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class StationShort(BaseModel):
    id: int
    station_id: str
    station_number: Optional[str] = None
    name: str
    address: Optional[str] = None
    operator_name: str = ""

    class Config:
        from_attributes = True


class TicketCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal: bool = False


class TicketCommentResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    user: UserShort
    content: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TicketHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    user: UserShort
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TicketAttachmentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: str
    uploaded_by: UserShort
    uploaded_at: datetime

    class Config:
        from_attributes = True


class TicketLogResponse(BaseModel):
    id: int
    log_type: str
    filename: str
    file_size: int
    collected_at: datetime
    log_start_time: Optional[datetime]
    log_end_time: Optional[datetime]
    description: Optional[str]

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    station_id: Optional[int]
    station: Optional[StationShort]
    port_number: Optional[int]
    reporter_name: Optional[str]
    reporter_phone: Optional[str]
    reporter_email: Optional[str]
    assigned_user_id: Optional[int]
    assigned_user: Optional[UserShort]
    assigned_department_id: Optional[int]
    assigned_department: Optional[DepartmentShort]
    created_by_id: int
    created_by: UserShort
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    sla_due_date: Optional[datetime]
    sla_breached: bool
    ai_log_analysis: Optional[AILogAnalysis] = None
    comments_count: int = 0
    attachments_count: int = 0
    # New fields from TZ
    incident_type: Optional[str] = None
    port_type: Optional[str] = None
    contact_source: Optional[str] = None
    station_logs: Optional[str] = None
    vehicle: Optional[str] = None  # Vehicle info

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    id: int
    ticket_number: str
    title: str
    category: str
    priority: str
    status: str
    station: Optional[StationShort]
    assigned_user: Optional[UserShort]
    assigned_department: Optional[DepartmentShort]
    created_by: UserShort
    created_at: datetime
    sla_due_date: Optional[datetime]
    sla_breached: bool

    class Config:
        from_attributes = True


class TicketDetailResponse(TicketResponse):
    comments: list[TicketCommentResponse]
    attachments: list[TicketAttachmentResponse]
    history: list[TicketHistoryResponse]
    logs: list[TicketLogResponse]


class ParseMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ParseMessageResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    # Station info
    station_id: Optional[str] = None  # Station identifier (e.g., "2537", "CH1234")
    station_db_id: Optional[int] = None  # Database ID if station found
    station_name: Optional[str] = None  # Full station name from message
    station_address: Optional[str] = None
    station_city: Optional[str] = None
    station_found: bool = False  # Whether station exists in DB
    # Operator info
    operator_name: Optional[str] = None
    operator_db_id: Optional[int] = None  # Database ID if operator found
    operator_found: bool = False  # Whether operator exists in DB
    # Port and vehicle
    port_number: Optional[int] = None
    vehicle_info: Optional[str] = None
    # Reporter info
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_email: Optional[str] = None
