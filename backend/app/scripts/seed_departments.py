"""Seed additional departments and reassign some users."""
import asyncio
import random
from sqlalchemy import select
from app.database import async_session_maker
from app.models.department import Department
from app.models.user import User


DEPARTMENTS = [
    {
        "name": "Дослідження та розробка",
        "name_en": "Research & Development",
        "description": "Відділ досліджень та розробки нових продуктів",
        "description_en": "Research and development of new products",
    },
    {
        "name": "Біллінг",
        "name_en": "Billing",
        "description": "Відділ обробки платежів та рахунків",
        "description_en": "Payment and invoice processing department",
    },
    {
        "name": "Кадри",
        "name_en": "Human Resources",
        "description": "Відділ управління персоналом",
        "description_en": "Personnel management department",
    },
    {
        "name": "Продажі",
        "name_en": "Sales",
        "description": "Відділ продажу послуг та продуктів",
        "description_en": "Sales of services and products",
    },
    {
        "name": "Маркетинг",
        "name_en": "Marketing",
        "description": "Відділ маркетингу та просування",
        "description_en": "Marketing and promotion department",
    },
    {
        "name": "Операційний відділ",
        "name_en": "Operations",
        "description": "Управління повсякденними операціями",
        "description_en": "Daily operations management",
    },
]


async def main():
    async with async_session_maker() as session:
        # Create departments
        created_depts = []
        for dept_data in DEPARTMENTS:
            # Check if department already exists
            result = await session.execute(
                select(Department).where(Department.name == dept_data["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Department '{dept_data['name']}' already exists, skipping")
                created_depts.append(existing)
                continue
            
            dept = Department(**dept_data)
            session.add(dept)
            created_depts.append(dept)
            print(f"Created department: {dept_data['name']} / {dept_data['name_en']}")
        
        await session.commit()
        
        # Refresh to get IDs
        for dept in created_depts:
            await session.refresh(dept)
        
        # Get all departments including Technical Support
        result = await session.execute(select(Department))
        all_depts = result.scalars().all()
        
        print(f"\nTotal departments: {len(all_depts)}")
        
        # Get all users except admin
        result = await session.execute(
            select(User).where(User.email != "admin@skai.ua")
        )
        users = result.scalars().all()
        
        # Reassign users to different departments
        # Distribute users across all departments
        reassigned = 0
        for i, user in enumerate(users):
            # Assign to different departments in round-robin fashion
            dept = all_depts[i % len(all_depts)]
            if user.department_id != dept.id:
                user.department_id = dept.id
                reassigned += 1
                print(f"Reassigned {user.first_name} {user.last_name} to {dept.name}")
        
        await session.commit()
        print(f"\nReassigned {reassigned} users to different departments")


if __name__ == "__main__":
    asyncio.run(main())
