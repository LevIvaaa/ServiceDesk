"""Redistribute users across ALL departments."""
import asyncio
import random
from sqlalchemy import select
from app.database import async_session_maker
from app.models.department import Department
from app.models.user import User


async def main():
    async with async_session_maker() as session:
        # Get all departments
        result = await session.execute(select(Department).order_by(Department.id))
        all_depts = list(result.scalars().all())
        
        print(f"Всього відділів: {len(all_depts)}\n")
        for dept in all_depts:
            print(f"  ID: {dept.id} | {dept.name}")
        
        # Get all users except admin and ticket handler
        result = await session.execute(
            select(User).where(
                User.email.notin_(["admin@ecofactor.ua", "tickets@gmail.com"])
            )
        )
        users = list(result.scalars().all())
        
        print(f"\nВсього користувачів для розподілу: {len(users)}")
        
        # Shuffle users for random distribution
        random.shuffle(users)
        
        # Calculate users per department
        users_per_dept = len(users) // len(all_depts)
        remainder = len(users) % len(all_depts)
        
        print(f"\nПлан розподілу:")
        print(f"  Базова кількість на відділ: {users_per_dept}")
        print(f"  Додаткових користувачів: {remainder}")
        
        # Redistribute users
        user_index = 0
        distribution_stats = {}
        
        for dept_idx, dept in enumerate(all_depts):
            # Calculate how many users this department should get
            dept_user_count = users_per_dept + (1 if dept_idx < remainder else 0)
            distribution_stats[dept.name] = []
            
            # Assign users to this department
            for _ in range(dept_user_count):
                if user_index < len(users):
                    user = users[user_index]
                    user.department_id = dept.id
                    distribution_stats[dept.name].append(f"{user.first_name} {user.last_name}")
                    user_index += 1
        
        await session.commit()
        
        # Print distribution results
        print(f"\n{'='*70}")
        print("РЕЗУЛЬТАТИ РОЗПОДІЛУ:")
        print(f"{'='*70}")
        for dept_name, user_names in distribution_stats.items():
            print(f"\n📁 {dept_name} ({len(user_names)} користувачів):")
            for user_name in user_names:
                print(f"   • {user_name}")
        
        print(f"\n{'='*70}")
        print(f"Всього розподілено: {user_index} користувачів")
        print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())
