"""Fix department translations - swap Ukrainian and English names."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.department import Department


# Correct translations
TRANSLATIONS = {
    "Research & Development": {
        "name_uk": "Дослідження та розробка",
        "description_uk": "Відділ досліджень та розробки нових продуктів",
    },
    "Billing": {
        "name_uk": "Біллінг",
        "description_uk": "Відділ обробки платежів та рахунків",
    },
    "Human Resources": {
        "name_uk": "Кадри",
        "description_uk": "Відділ управління персоналом",
    },
    "Sales": {
        "name_uk": "Продажі",
        "description_uk": "Відділ продажу послуг та продуктів",
    },
    "Marketing": {
        "name_uk": "Маркетинг",
        "description_uk": "Відділ маркетингу та просування",
    },
    "Operations": {
        "name_uk": "Операційний відділ",
        "description_uk": "Управління повсякденними операціями",
    },
}


async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Department))
        departments = result.scalars().all()
        
        updated_count = 0
        for dept in departments:
            if dept.name in TRANSLATIONS:
                # Current English name
                english_name = dept.name
                english_desc = dept.description
                
                # Get Ukrainian translation
                ukrainian_name = TRANSLATIONS[english_name]["name_uk"]
                ukrainian_desc = TRANSLATIONS[english_name]["description_uk"]
                
                # Swap: Ukrainian goes to main fields, English to _en fields
                dept.name = ukrainian_name
                dept.description = ukrainian_desc
                dept.name_en = english_name
                dept.description_en = english_desc
                
                updated_count += 1
                print(f"Fixed: {english_name} -> {ukrainian_name} (en: {english_name})")
        
        await session.commit()
        print(f"\nFixed {updated_count} departments")


if __name__ == "__main__":
    asyncio.run(main())
