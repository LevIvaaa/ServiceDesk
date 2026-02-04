"""
Delete users without password and roles
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import async_session_maker
from app.models.user import User


async def delete_users_without_credentials():
    """Delete all users that don't have password or roles"""
    async with async_session_maker() as session:
        # Find all users with their roles
        result = await session.execute(
            select(User).options(selectinload(User.roles))
        )
        all_users = result.scalars().all()
        
        users_to_delete = []
        for user in all_users:
            # Check if user has no password or no roles
            has_no_password = not user.password_hash or user.password_hash == ''
            has_no_roles = not user.roles or len(user.roles) == 0
            
            if has_no_password or has_no_roles:
                users_to_delete.append(user)
        
        if not users_to_delete:
            print("No users without credentials or roles found")
            return
        
        print(f"Found {len(users_to_delete)} users without credentials or roles:")
        for user in users_to_delete:
            print(f"  - ID: {user.id}, Name: {user.first_name} {user.last_name}, Email: {user.email}, Roles: {len(user.roles)}, Has password: {bool(user.password_hash)}")
        
        # Delete them
        for user in users_to_delete:
            await session.delete(user)
        
        await session.commit()
        print(f"\nDeleted {len(users_to_delete)} users successfully")


if __name__ == "__main__":
    asyncio.run(delete_users_without_credentials())
