"""
Create Ticket Handler user with appropriate permissions
"""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.core.security import get_password_hash


async def create_ticket_handler():
    async with async_session_maker() as db:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == "tickets@gmail.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Ticket Handler user already exists!")
            return
        
        # Get ticket_handler role
        result = await db.execute(
            select(Role).where(Role.name == "ticket_handler")
        )
        role = result.scalar_one_or_none()
        
        if not role:
            print("ERROR: ticket_handler role not found!")
            return
        
        # Get Технічна підтримка department
        result = await db.execute(
            select(Department).where(Department.name == "Технічна підтримка")
        )
        department = result.scalar_one_or_none()
        
        if not department:
            print("ERROR: Технічна підтримка department not found!")
            return
        
        # Create user
        user = User(
            email="tickets@gmail.com",
            password_hash=get_password_hash("lagger2099"),
            first_name="Ticket",
            last_name="Handler",
            first_name_en="Ticket",
            last_name_en="Handler",
            department_id=department.id,
            is_active=True,
        )
        
        db.add(user)
        await db.flush()
        
        # Add role to user
        user.roles.append(role)
        
        await db.commit()
        
        print("✅ Ticket Handler user created successfully!")
        print(f"   Email: tickets@gmail.com")
        print(f"   Password: lagger2099")
        print(f"   Role: {role.name}")
        print(f"   Department: {department.name}")


if __name__ == "__main__":
    asyncio.run(create_ticket_handler())
