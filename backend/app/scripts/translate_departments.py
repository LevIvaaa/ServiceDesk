"""Translate department names to English."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.department import Department


async def main():
    async with async_session_maker() as session:
        # Get all departments
        result = await session.execute(select(Department))
        departments = result.scalars().all()
        
        # Translation map
        translations = {
            "Технічна підтримка": {
                "name_en": "Technical Support",
                "description_en": "Technical support department for charging stations"
            }
        }
        
        updated_count = 0
        for dept in departments:
            if dept.name in translations:
                dept.name_en = translations[dept.name]["name_en"]
                dept.description_en = translations[dept.name]["description_en"]
                updated_count += 1
                print(f"Translated: {dept.name} -> {dept.name_en}")
        
        await session.commit()
        print(f"\nTranslated {updated_count} departments")


if __name__ == "__main__":
    asyncio.run(main())
