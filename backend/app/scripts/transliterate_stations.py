"""Script to translate and transliterate station data."""
import asyncio
import logging
from sqlalchemy import select
from app.database import async_session_maker
from app.models.station import Station
from app.utils.transliteration import transliterate

logger = logging.getLogger(__name__)

async def main():
    async with async_session_maker() as db:
        result = await db.execute(select(Station))
        stations = result.scalars().all()
        
        for station in stations:
            # Translate name (Зарядна станція -> Charging Station)
            if station.name:
                station.name_en = station.name.replace("Зарядна станція", "Charging Station")
            
            # Transliterate address
            if station.address:
                station.address_en = transliterate(station.address)
            
            # Transliterate city
            if station.city:
                station.city_en = transliterate(station.city)
            
            # Transliterate region
            if station.region:
                station.region_en = transliterate(station.region)
            
            logger.info(f"{station.station_id}: {station.name} -> {station.name_en}")
            logger.info(f"  {station.city} -> {station.city_en}")
        
        await db.commit()
        logger.info(f"Processed {len(stations)} stations")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
