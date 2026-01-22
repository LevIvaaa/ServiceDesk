"""
Seed script to populate the database with sample charging stations.
"""
import asyncio
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.operator import Operator
from app.models.station import Station, StationPort

logger = logging.getLogger(__name__)


async def seed_operator(db: AsyncSession) -> Operator:
    """Create or get default operator."""
    result = await db.execute(select(Operator).where(Operator.code == "SKAI"))
    operator = result.scalar_one_or_none()
    
    if not operator:
        operator = Operator(
            name="SK.AI Charging Network",
            code="SKAI",
            contact_email="support@skai.ua",
            contact_phone="+380443334455",
            is_active=True,
        )
        db.add(operator)
        await db.flush()
        logger.info("Created default operator")
    
    return operator


async def seed_stations(db: AsyncSession):
    """Create 30+ sample charging stations."""
    logger.info("Seeding stations...")
    
    operator = await seed_operator(db)
    
    # Ukrainian cities with coordinates
    cities_data = [
        ("Київ", "Київська", 50.4501, 30.5234),
        ("Львів", "Львівська", 49.8397, 24.0297),
        ("Одеса", "Одеська", 46.4825, 30.7233),
        ("Харків", "Харківська", 49.9935, 36.2304),
        ("Дніпро", "Дніпропетровська", 48.4647, 35.0462),
        ("Запоріжжя", "Запорізька", 47.8388, 35.1396),
        ("Вінниця", "Вінницька", 49.2331, 28.4682),
        ("Полтава", "Полтавська", 49.5883, 34.5514),
        ("Черкаси", "Черкаська", 49.4444, 32.0598),
        ("Чернівці", "Чернівецька", 48.2921, 25.9358),
    ]
    
    # Station models and manufacturers
    models = [
        ("ABB Terra 54", "ABB", "CCS2", 50),
        ("ABB Terra 184", "ABB", "CCS2", 180),
        ("Delta DC City", "Delta", "CCS2", 25),
        ("Kempower Satellite", "Kempower", "CCS2", 40),
        ("Tritium RTM75", "Tritium", "CCS2", 75),
        ("Efacec QC45", "Efacec", "CCS2", 45),
        ("Alpitronic HYC300", "Alpitronic", "CCS2", 300),
        ("Hypercharger", "Alpitronic", "CCS2", 150),
    ]
    
    statuses = ["available", "charging", "offline", "faulted"]
    
    stations_created = 0
    
    for i in range(35):  # Create 35 stations
        city, region, lat, lon = cities_data[i % len(cities_data)]
        model_name, manufacturer, connector, power = models[i % len(models)]
        status = statuses[0] if i % 5 != 4 else statuses[i % len(statuses)]
        
        # Add some variation to coordinates
        lat_offset = (i % 10 - 5) * 0.01
        lon_offset = ((i * 3) % 10 - 5) * 0.01
        
        station_id = f"CHG-{str(i+1).zfill(3)}"
        
        # Check if station already exists
        existing = await db.execute(
            select(Station).where(Station.station_id == station_id)
        )
        if existing.scalar_one_or_none():
            logger.info(f"Station {station_id} already exists, skipping")
            continue
        
        station = Station(
            station_id=station_id,
            name=f"Зарядна станція {city} #{(i % 5) + 1}",
            operator_id=operator.id,
            address=f"вул. {['Центральна', 'Головна', 'Шевченка', 'Франка', 'Лесі Українки'][i % 5]}, {(i % 50) + 1}",
            city=city,
            region=region,
            latitude=lat + lat_offset,
            longitude=lon + lon_offset,
            model=model_name,
            manufacturer=manufacturer,
            firmware_version=f"v{1 + (i % 3)}.{(i % 10)}.{(i % 20)}",
            installation_date=date(2022 + (i % 3), 1 + (i % 12), 1 + (i % 28)),
            status=status,
        )
        db.add(station)
        await db.flush()
        
        # Add 1-2 ports per station
        num_ports = 1 if i % 3 == 0 else 2
        for port_num in range(1, num_ports + 1):
            port_status = status if port_num == 1 else statuses[(i + port_num) % len(statuses)]
            port = StationPort(
                station_id=station.id,
                port_number=port_num,
                connector_type=connector,
                power_kw=power,
                status=port_status,
            )
            db.add(port)
        
        stations_created += 1
        logger.info(f"Created station: {station_id} - {station.name}")
    
    await db.flush()
    logger.info(f"Created {stations_created} stations with ports")


async def main():
    """Main function to run the seeding."""
    logger.info("Starting stations seeding...")
    
    async with async_session_maker() as db:
        try:
            await seed_stations(db)
            await db.commit()
            logger.info("Stations seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"Stations seeding failed: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
