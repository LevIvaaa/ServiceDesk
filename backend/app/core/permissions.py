from typing import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.role import Permission, RolePermission, Role
from app.models.user import UserRole

# List of all permissions
PERMISSIONS = [
    # Tickets
    ("tickets.view", "Перегляд тікетів", "tickets"),
    ("tickets.view_all", "Перегляд всіх тікетів", "tickets"),
    ("tickets.create", "Створення тікетів", "tickets"),
    ("tickets.edit", "Редагування тікетів", "tickets"),
    ("tickets.delete", "Видалення тікетів", "tickets"),
    ("tickets.assign", "Призначення тікетів", "tickets"),
    ("tickets.change_status", "Зміна статусу", "tickets"),
    ("tickets.add_comment", "Додавання коментарів", "tickets"),
    ("tickets.view_internal_comments", "Перегляд внутрішніх коментарів", "tickets"),
    ("tickets.collect_logs", "Збір логів станції", "tickets"),
    ("tickets.add_logs", "Завантаження логів", "tickets"),
    ("tickets.delete_logs", "Видалення логів", "tickets"),
    ("tickets.delegate", "Делегування в інший відділ", "tickets"),

    # Users
    ("users.view", "Перегляд користувачів", "users"),
    ("users.create", "Створення користувачів", "users"),
    ("users.edit", "Редагування користувачів", "users"),
    ("users.delete", "Видалення користувачів", "users"),
    ("users.manage_roles", "Управління ролями користувачів", "users"),

    # Departments
    ("departments.view", "Перегляд відділів", "departments"),
    ("departments.create", "Створення відділів", "departments"),
    ("departments.edit", "Редагування відділів", "departments"),
    ("departments.delete", "Видалення відділів", "departments"),

    # Stations
    ("stations.view", "Перегляд станцій", "stations"),
    ("stations.create", "Створення станцій", "stations"),
    ("stations.edit", "Редагування станцій", "stations"),
    ("stations.delete", "Видалення станцій", "stations"),

    # Operators
    ("operators.view", "Перегляд операторів", "operators"),
    ("operators.create", "Створення операторів", "operators"),
    ("operators.edit", "Редагування операторів", "operators"),
    ("operators.delete", "Видалення операторів", "operators"),

    # Knowledge base
    ("knowledge.view", "Перегляд бази знань", "knowledge_base"),
    ("knowledge.create", "Створення статей", "knowledge_base"),
    ("knowledge.edit", "Редагування статей", "knowledge_base"),
    ("knowledge.delete", "Видалення статей", "knowledge_base"),
    ("knowledge.publish", "Публікація статей", "knowledge_base"),

    # Settings
    ("settings.view", "Перегляд налаштувань", "settings"),
    ("settings.edit", "Редагування налаштувань", "settings"),
    ("settings.roles_matrix", "Матриця ролей", "settings"),

    # Reports
    ("reports.view", "Перегляд звітів", "reports"),
    ("reports.export", "Експорт звітів", "reports"),

    # Integrations
    ("integrations.view", "Перегляд інтеграцій", "integrations"),
    ("integrations.manage", "Управління інтеграціями", "integrations"),
]


async def check_permission(
    user: User,
    permission_code: str,
    db: AsyncSession
) -> bool:
    """
    Check permission for a user.
    Administrator (is_admin=True) has all permissions.
    """
    if user.is_admin:
        return True

    # Get all permissions through user roles
    query = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user.id,
            Permission.code == permission_code
        )
    )

    result = await db.execute(query)
    return result.scalar() is not None


async def get_user_permissions(user: User, db: AsyncSession) -> list[str]:
    """Get all permission codes for a user."""
    if user.is_admin:
        return [p[0] for p in PERMISSIONS]

    query = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    )

    result = await db.execute(query)
    return list(result.scalars().all())


def require_permission(permission_code: str) -> Callable:
    """Decorator for endpoints requiring specific permission."""
    async def dependency(
        current_user: User = Depends(lambda: None),  # Will be replaced by actual dependency
        db: AsyncSession = Depends(get_db)
    ):
        if not await check_permission(current_user, permission_code, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission_code}"
            )
        return current_user
    return Depends(dependency)


class PermissionChecker:
    """Class-based permission checker for use as dependency."""

    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    async def __call__(
        self,
        db: AsyncSession = Depends(get_db),
        current_user: User = None  # Will be injected
    ) -> User:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        if not await check_permission(current_user, self.permission_code, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission_code}"
            )
        return current_user
