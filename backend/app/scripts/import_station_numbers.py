"""Import station numbers from chargePoints CSV file"""
import asyncio
import csv
from sqlalchemy import select, update
from app.database import async_session_maker
from app.models.station import Station


async def import_station_numbers():
    """Import station numbers from chargePoints (2).csv"""
    
    # Read CSV file
    station_numbers = {}
    try:
        with open('chargePoints.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                identifier = row.get('identifier', '').strip()
                number = row.get('number', '').strip()
                if identifier and number:
                    station_numbers[identifier] = number
                    print(f"Found: {identifier} -> {number}")
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return
    
    print(f"\nTotal stations in CSV: {len(station_numbers)}")
    
    # Update database
    async with async_session_maker() as db:
        # Get all stations
        result = await db.execute(select(Station))
        stations = result.scalars().all()
        
        updated = 0
        not_found = 0
        
        for station in stations:
            if station.station_id in station_numbers:
                number = station_numbers[station.station_id]
                await db.execute(
                    update(Station)
                    .where(Station.id == station.id)
                    .values(station_number=number)
                )
                print(f"Updated: {station.station_id} -> {number}")
                updated += 1
            else:
                print(f"Not found in CSV: {station.station_id}")
                not_found += 1
        
        await db.commit()
        
        print(f"\n✅ Updated: {updated}")
        print(f"❌ Not found: {not_found}")


if __name__ == "__main__":
    asyncio.run(import_station_numbers())
