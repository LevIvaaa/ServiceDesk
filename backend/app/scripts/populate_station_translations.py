"""
Script to populate English translations for existing stations.
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.station import Station

logger = logging.getLogger(__name__)


# Translation mappings
CITY_TRANSLATIONS = {
    "Київ": "Kyiv",
    "Львів": "Lviv",
    "Одеса": "Odesa",
    "Харків": "Kharkiv",
    "Дніпро": "Dnipro",
    "Запоріжжя": "Zaporizhzhia",
    "Вінниця": "Vinnytsia",
    "Полтава": "Poltava",
    "Черкаси": "Cherkasy",
    "Чернівці": "Chernivtsi",
}

REGION_TRANSLATIONS = {
    "Київська": "Kyiv Oblast",
    "Львівська": "Lviv Oblast",
    "Одеська": "Odesa Oblast",
    "Харківська": "Kharkiv Oblast",
    "Дніпропетровська": "Dnipropetrovsk Oblast",
    "Запорізька": "Zaporizhzhia Oblast",
    "Вінницька": "Vinnytsia Oblast",
    "Полтавська": "Poltava Oblast",
    "Черкаська": "Cherkasy Oblast",
    "Чернівецька": "Chernivtsi Oblast",
}

STREET_TRANSLATIONS = {
    "Центральна": "Central",
    "Головна": "Main",
    "Шевченка": "Shevchenko",
    "Франка": "Franko",
    "Лесі Українки": "Lesi Ukrainky",
}


async def populate_translations(db: AsyncSession):
    """Populate English translations for all stations."""
    logger.info("Populating English translations for stations...")
    
    result = await db.execute(select(Station))
    stations = result.scalars().all()
    
    updated_count = 0
    
    for station in stations:
        # Translate city
        if station.city and station.city in CITY_TRANSLATIONS:
            station.city_en = CITY_TRANSLATIONS[station.city]
        
        # Translate region
        if station.region and station.region in REGION_TRANSLATIONS:
            station.region_en = REGION_TRANSLATIONS[station.region]
        
        # Translate station name
        # "Зарядна станція Київ #1" -> "Charging Station Kyiv #1"
        if station.name and station.name.startswith("Зарядна станція"):
            name_en = station.name.replace("Зарядна станція", "Charging Station")
            for ukr_city, eng_city in CITY_TRANSLATIONS.items():
                if ukr_city in name_en:
                    name_en = name_en.replace(ukr_city, eng_city)
                    break
            station.name_en = name_en
        
        # Translate address
        # "вул. Центральна, 1" -> "1 Central St"
        if station.address and station.address.startswith("вул."):
            for ukr_street, eng_street in STREET_TRANSLATIONS.items():
                if ukr_street in station.address:
                    # Extract number
                    parts = station.address.split(", ")
                    if len(parts) == 2:
                        number = parts[1]
                        station.address_en = f"{number} {eng_street} St"
                    break
        
        updated_count += 1
        logger.info(f"Translated: {station.station_id} - {station.name} -> {station.name_en}")
    
    await db.flush()
    logger.info(f"Populated translations for {updated_count} stations")


async def main():
    """Main function to run the translation population."""
    logger.info("Starting translation population...")
    
    async with async_session_maker() as db:
        try:
            await populate_translations(db)
            await db.commit()
            logger.info("Translation population completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"Translation population failed: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
