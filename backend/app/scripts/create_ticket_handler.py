"""
Create ticket handler user and role.
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.role import Permission, Role, RolePermission
from app.models.user import User, UserRole, UserNotificationSettings
from app.models.department import Department
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_ticket_handler():
    """Create ticket handler role and user."""
    logger.info("Creating ticket handler system...")

    async with async_session_maker() as db:
        try:
            # 1. Create "Ticket Handler" role
            logger.info("\n1. Creating Ticket Handler role...")
            existing_role = await db.execute(
                select(Role).where(Role.name == "ticket_handler")
            )
            role = existing_role.scalar_one_or_none()
            
            if not role:
                role = Role(
                    name="ticket_handler",
                    description="Обробник тікетів - приймає та обробляє вхідні тікети",
                    is_system=True,
                )
                db.add(role)
                await db.flush()

                # Permissions for Ticket Handler
                permission_codes = [
                    # Tickets - full access
                    "tickets.view",
                    "tickets.view_all",
                    "tickets.edit",
                    "tickets.assign",
                    "tickets.change_status",
                    "tickets.add_comment",
                    "tickets.view_internal_comments",
                    "tickets.collect_logs",
                    "tickets.add_logs",
                    "tickets.delegate",
                    
                    # Other modules - view only
                    "stations.view",
                    "operators.view",
                    "knowledge.view",
                    "users.view",
                    "departments.view",
                ]

                for perm_code in permission_codes:
                    perm_result = await db.execute(
                        select(Permission).where(Permission.code == perm_code)
                    )
                    perm = perm_result.scalar_one_or_none()
                    if perm:
                        db.add(RolePermission(role_id=role.id, permission_id=perm.id))

                logger.info(f"  ✓ Created Ticket Handler role with {len(permission_codes)} permissions")
            else:
                logger.info("  ✓ Ticket Handler role already exists")

            # 2. Get Technical Support department
            logger.info("\n2. Finding Technical Support department...")
            dept_result = await db.execute(
                select(Department).where(Department.name == "Технічна підтримка")
            )
            tech_support_dept = dept_result.scalar_one_or_none()
            
            if not tech_support_dept:
                logger.error("  ✗ Technical Support department not found!")
                return
            
            logger.info(f"  ✓ Found department: {tech_support_dept.name} (ID: {tech_support_dept.id})")

            # 3. Create ticket handler user
            logger.info("\n3. Creating ticket handler user...")
            existing_user = await db.execute(
                select(User).where(User.email == "tickets@gmail.com")
            )
            user = existing_user.scalar_one_or_none()
            
            if not user:
                user = User(
                    email="tickets@gmail.com",
                    password_hash=get_password_hash("lagger2099"),
                    first_name="Ticket",
                    last_name="Handler",
                    first_name_en="Ticket",
                    last_name_en="Handler",
                    phone="+380501111111",
                    is_active=True,
                    is_admin=False,
                    department_id=tech_support_dept.id,
                )
                db.add(user)
                await db.flush()

                # Create notification settings
                settings = UserNotificationSettings(user_id=user.id)
                db.add(settings)
                await db.flush()

                logger.info(f"  ✓ Created user: {user.first_name} {user.last_name}")
                logger.info(f"    Email: {user.email}")
                logger.info(f"    Password: lagger2099")
                logger.info(f"    Department: {tech_support_dept.name}")
            else:
                logger.info(f"  ✓ User already exists: {user.email}")

            # 4. Assign Ticket Handler role
            logger.info("\n4. Assigning Ticket Handler role...")
            existing_user_role = await db.execute(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.role_id == role.id
                )
            )
            if not existing_user_role.scalar_one_or_none():
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)
                logger.info("  ✓ Assigned Ticket Handler role to user")
            else:
                logger.info("  ✓ User already has Ticket Handler role")

            await db.commit()
            
            logger.info("\n" + "="*60)
            logger.info("✓ Ticket Handler system created successfully!")
            logger.info("="*60)
            logger.info("\nLogin Credentials:")
            logger.info("  Email: tickets@gmail.com")
            logger.info("  Password: lagger2099")
            logger.info("  Role: Ticket Handler")
            logger.info("  Department: Technical Support")
            logger.info("\nThis user can:")
            logger.info("  - View all incoming tickets")
            logger.info("  - Assign tickets to users/departments")
            logger.info("  - Change ticket status")
            logger.info("  - Add comments and internal notes")
            logger.info("  - Collect and analyze logs")
            logger.info("  - Delegate tickets to other departments")
            logger.info("  - CANNOT create new tickets (only receive)")
            logger.info("="*60)

        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create ticket handler: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(create_ticket_handler())
