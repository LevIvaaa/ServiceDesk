"""
Randomize station operators with random names
"""
import asyncio
import random
from sqlalchemy import select, update
from app.database import async_session_maker
from app.models.station import Station
from app.models.operator import Operator


# Ukrainian names
FIRST_NAMES = [
    "Олександр", "Дмитро", "Андрій", "Сергій", "Максим",
    "Іван", "Володимир", "Віктор", "Олег", "Юрій",
    "Петро", "Михайло", "Василь", "Богдан", "Тарас",
    "Роман", "Ігор", "Павло", "Артем", "Денис"
]

LAST_NAMES = [
    "Коваленко", "Бондаренко", "Ткаченко", "Шевченко", "Кравченко",
    "Мельник", "Поліщук", "Марченко", "Савченко", "Литвиненко",
    "Павленко", "Гончаренко", "Іваненко", "Петренко", "Сидоренко",
    "Романенко", "Захарченко", "Григоренко", "Яременко", "Левченко"
]


async def randomize_operators():
    async with async_session_maker() as db:
        # Get all operators
        result = await db.execute(select(Operator))
        operators = result.scalars().all()
        
        if not operators:
            print("No operators found!")
            return
        
        print(f"Found {len(operators)} operators")
        
        # Update each operator with random name
        for operator in operators:
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            
            operator.name = full_name
            print(f"Updated operator {operator.id}: {full_name}")
        
        await db.commit()
        print(f"\n✅ Successfully updated {len(operators)} operators with random names!")


if __name__ == "__main__":
    asyncio.run(randomize_operators())
