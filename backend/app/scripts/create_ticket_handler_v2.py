"""Create Ticket Handler user with proper permissions."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.core.security import get_password_hash


async def main():
    async with async_session_maker() as session:
        # Get or create Ticket Handler role
        result = await session.execute(
            select(Role).where(Role.name == "ticket_handler")
        )
        role = result.scalar_one_or_none()
        
        if not role:
            # Create role with permissions for handling tickets
            role = Role(
                name="ticket_handler",
                name_en="Ticket Handler",
                description="Обробляє тікети від адміністратора",
                description_en="Handles tickets from administrator",
                permissions=[
                    # Tickets permissions
                    "tickets.view",
                    "tickets.edit",
                    "tickets.assign",
                    "tickets.comment",
                    "tickets.view_all",
                    "tickets.change_status",
                    "tickets.view_attachments",
                    "tickets.upload_attachments",
                    
                    # Users permissions (view only)
                    "users.view",
                    
                    # Departments permissions (view only)
                    "departments.view",
                    
                    # Stations permissions (view only)
                    "stations.view",
                    
                    # Operators permissions (view only)
                    "operators.view",
                    
                    # Knowledge base (view only)
                    "knowledge_base.view",
                ],
            )
            session.add(role)
            await session.flush()
            print(f"✅ Створено роль: {role.name}")
        else:
            print(f"ℹ️  Роль вже існує: {role.name}")
        
        # Get Technical Support department
        result = await session.execute(
            select(Department).where(Department.name == "Технічна підтримка")
        )
        department = result.scalar_one_or_none()
        
        if not department:
            print("❌ Відділ 'Технічна підтримка' не знайдено")
            return
        
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == "handler@ecofactor.ua")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ Користувач з email handler@ecofactor.ua вже існує")
            return
        
        # Create Ticket Handler user
        user = User(
            email="handler@ecofactor.ua",
            password_hash=get_password_hash("handler123"),
            first_name="Обробник",
            last_name="Тікетів",
            first_name_en="Ticket",
            last_name_en="Handler",
            is_active=True,
            department_id=department.id,
        )
        user.roles.append(role)
        
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        print(f"\n{'='*60}")
        print("✅ TICKET HANDLER СТВОРЕНО")
        print(f"{'='*60}")
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Password: handler123")
        print(f"Ім'я: {user.first_name} {user.last_name}")
        print(f"Роль: {role.name}")
        print(f"Відділ: {department.name}")
        print(f"Кількість дозволів: {len(role.permissions)}")
        print(f"\nДозволи:")
        for perm in sorted(role.permissions):
            print(f"  • {perm}")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
