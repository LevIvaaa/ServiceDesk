from app.schemas.auth import Token, TokenPayload, LoginRequest, ChangePasswordRequest
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserNotificationSettingsUpdate,
    UserNotificationSettingsResponse,
)
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentListResponse,
)
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    PermissionResponse,
    RolePermissionsUpdate,
)
from app.schemas.operator import (
    OperatorCreate,
    OperatorUpdate,
    OperatorResponse,
    OperatorListResponse,
)
from app.schemas.station import (
    StationCreate,
    StationUpdate,
    StationResponse,
    StationListResponse,
    StationPortCreate,
    StationPortResponse,
)
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TicketCommentCreate,
    TicketCommentResponse,
    TicketHistoryResponse,
    TicketStatusUpdate,
    TicketAssignUpdate,
    TicketDelegateUpdate,
)
from app.schemas.knowledge_base import (
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeArticleResponse,
    KnowledgeArticleListResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
)
from app.schemas.common import PaginationParams, PaginatedResponse

__all__ = [
    # Auth
    "Token",
    "TokenPayload",
    "LoginRequest",
    "ChangePasswordRequest",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "UserNotificationSettingsUpdate",
    "UserNotificationSettingsResponse",
    # Department
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentResponse",
    "DepartmentListResponse",
    # Role
    "RoleCreate",
    "RoleUpdate",
    "RoleResponse",
    "PermissionResponse",
    "RolePermissionsUpdate",
    # Operator
    "OperatorCreate",
    "OperatorUpdate",
    "OperatorResponse",
    "OperatorListResponse",
    # Station
    "StationCreate",
    "StationUpdate",
    "StationResponse",
    "StationListResponse",
    "StationPortCreate",
    "StationPortResponse",
    # Ticket
    "TicketCreate",
    "TicketUpdate",
    "TicketResponse",
    "TicketListResponse",
    "TicketCommentCreate",
    "TicketCommentResponse",
    "TicketHistoryResponse",
    "TicketStatusUpdate",
    "TicketAssignUpdate",
    "TicketDelegateUpdate",
    # Knowledge Base
    "KnowledgeArticleCreate",
    "KnowledgeArticleUpdate",
    "KnowledgeArticleResponse",
    "KnowledgeArticleListResponse",
    "KnowledgeSearchRequest",
    "KnowledgeSearchResponse",
    # Common
    "PaginationParams",
    "PaginatedResponse",
]
