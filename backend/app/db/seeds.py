import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PERMISSIONS
from app.core.security import get_password_hash
from app.database import async_session_maker
from app.models.department import Department
from app.models.role import Permission, Role, RolePermission
from app.models.user import User, UserNotificationSettings, UserRole

logger = logging.getLogger(__name__)


async def seed_permissions(db: AsyncSession):
    """Create all permissions."""
    logger.info("Seeding permissions...")

    for code, name, category in PERMISSIONS:
        # Check if permission already exists
        existing = await db.execute(
            select(Permission).where(Permission.code == code)
        )
        if not existing.scalar_one_or_none():
            permission = Permission(
                code=code,
                name=name,
                category=category,
            )
            db.add(permission)

    await db.flush()
    logger.info(f"Created {len(PERMISSIONS)} permissions")


async def seed_roles(db: AsyncSession):
    """Create system roles with permissions."""
    logger.info("Seeding roles...")

    roles_config = {
        "user": {
            "description": "Користувач - створення та обробка тікетів",
            "permissions": [
                "tickets.view", "tickets.view_all", "tickets.create",
                "tickets.edit", "tickets.delete", "tickets.assign",
                "tickets.delegate", "tickets.change_status",
                "tickets.add_comment", "tickets.view_internal_comments",
                "tickets.collect_logs",
                "stations.view", "operators.view",
                "knowledge.view", "departments.view", "users.view",
            ],
        },
    }

    for role_name, config in roles_config.items():
        # Check if role already exists
        existing = await db.execute(select(Role).where(Role.name == role_name))
        role = existing.scalar_one_or_none()

        if not role:
            role = Role(
                name=role_name,
                description=config["description"],
                is_system=True,
            )
            db.add(role)
            await db.flush()

            # Add permissions
            for perm_code in config["permissions"]:
                perm_result = await db.execute(
                    select(Permission).where(Permission.code == perm_code)
                )
                perm = perm_result.scalar_one_or_none()
                if perm:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))

    await db.flush()
    logger.info("Created system roles")


async def seed_admin_user(db: AsyncSession):
    """Create admin user."""
    logger.info("Seeding admin user...")

    # Check if admin already exists
    existing = await db.execute(
        select(User).where(User.email == "admin@ecofactor.ua")
    )
    if existing.scalar_one_or_none():
        logger.info("Admin user already exists")
        return

    admin = User(
        email="admin@ecofactor.ua",
        password_hash=get_password_hash("admin123"),  # Change in production!
        first_name="Admin",
        last_name="Ecofactor",
        is_admin=True,
        is_active=True,
    )
    db.add(admin)
    await db.flush()

    # Create notification settings
    settings = UserNotificationSettings(user_id=admin.id)
    db.add(settings)

    await db.flush()
    logger.info("Created admin user (email: admin@ecofactor.ua, password: admin123)")


async def seed_department(db: AsyncSession):
    """Create initial department."""
    logger.info("Seeding department...")

    existing = await db.execute(
        select(Department).where(Department.name == "Технічна підтримка")
    )
    if existing.scalar_one_or_none():
        logger.info("Department already exists")
        return

    dept = Department(
        name="Технічна підтримка",
        description="Відділ технічної підтримки зарядних станцій",
    )
    db.add(dept)
    await db.flush()
    logger.info("Created department")


async def seed_initial_data():
    """Seed all initial data."""
    logger.info("Starting database seeding...")

    async with async_session_maker() as db:
        try:
            await seed_permissions(db)
            await seed_roles(db)
            await seed_admin_user(db)
            await seed_department(db)
            await db.commit()
            logger.info("Database seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"Database seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_initial_data())
