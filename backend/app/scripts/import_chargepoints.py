"""Import charge points from CSV file."""
import asyncio
import csv
from sqlalchemy import select
from app.database import async_session_maker
from app.models.operator import Operator
from app.models.station import Station, StationPort


async def main():
    # Read CSV file
    stations_data = []
    operators_set = set()
    
    with open('chargePoints.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            partner = row.get('partner', '').strip()
            if partner:
                operators_set.add(partner)
            
            # Parse connector data
            connectors = []
            for i in range(1, 7):  # Up to 6 connectors
                conn_type = row.get(f'connector{i}type', '').strip()
                conn_status = row.get(f'connector{i}status', '').strip()
                if conn_type:
                    connectors.append({
                        'type': conn_type,
                        'status': conn_status,
                        'number': i
                    })
            
            station = {
                'identifier': row.get('identifier', '').strip(),
                'name': row.get('name', '').strip(),
                'city': row.get('city', '').strip(),
                'street': row.get('street', '').strip(),
                'house_number': row.get('houseNumber', '').strip(),
                'latitude': row.get('latitude', '').strip(),
                'longitude': row.get('longitude', '').strip(),
                'partner': partner,
                'online': row.get('online', '').lower() == 'true',
                'connectors': connectors,
                'total_connectors': row.get('totalConnectors', '0').strip(),
            }
            
            if station['identifier'] and station['name']:
                stations_data.append(station)
    
    print(f"Found {len(stations_data)} stations")
    print(f"Found {len(operators_set)} unique operators")
    
    async with async_session_maker() as session:
        # Create operators
        operator_map = {}
        operator_counter = 1
        for operator_name in sorted(operators_set):
            if not operator_name:
                continue
                
            # Check if operator exists
            result = await session.execute(
                select(Operator).where(Operator.name == operator_name)
            )
            operator = result.scalar_one_or_none()
            
            if not operator:
                # Generate unique code from name
                code_base = ''.join(c for c in operator_name if c.isalnum())[:15].upper()
                if not code_base:
                    code_base = "OPERATOR"
                
                # Make code unique by adding counter if needed
                code = code_base
                counter = 1
                while True:
                    # Check if code exists
                    result = await session.execute(
                        select(Operator).where(Operator.code == code)
                    )
                    if not result.scalar_one_or_none():
                        break
                    code = f"{code_base}{counter}"
                    counter += 1
                
                operator = Operator(
                    name=operator_name,
                    code=code
                )
                session.add(operator)
                await session.flush()
                print(f"Created operator: {operator_name} ({code})")
                operator_counter += 1
            
            operator_map[operator_name] = operator.id
        
        await session.commit()
        print(f"\n✅ Created {len(operator_map)} operators")
        
        # Create stations
        created_count = 0
        skipped_count = 0
        
        for station_data in stations_data:
            # Check if station exists
            result = await session.execute(
                select(Station).where(Station.station_id == station_data['identifier'])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                skipped_count += 1
                continue
            
            # Get operator ID
            operator_id = operator_map.get(station_data['partner'])
            if not operator_id:
                continue
            
            # Create station
            try:
                lat = float(station_data['latitude']) if station_data['latitude'] else None
                lon = float(station_data['longitude']) if station_data['longitude'] else None
            except:
                lat = None
                lon = None
            
            address = f"{station_data['street']} {station_data['house_number']}".strip()
            
            station = Station(
                station_id=station_data['identifier'],
                name=station_data['name'],
                operator_id=operator_id,
                city=station_data['city'] or None,
                address=address or None,
                latitude=lat,
                longitude=lon,
                status='online' if station_data['online'] else 'offline',
            )
            session.add(station)
            await session.flush()
            
            # Create ports
            for conn in station_data['connectors']:
                port = StationPort(
                    station_id=station.id,
                    port_number=conn['number'],
                    connector_type=conn['type'],
                    status=conn['status'] or 'available',
                )
                session.add(port)
            
            created_count += 1
            
            if created_count % 100 == 0:
                print(f"Created {created_count} stations...")
        
        await session.commit()
        print(f"\n✅ Created {created_count} stations")
        print(f"⏭️  Skipped {skipped_count} existing stations")


if __name__ == "__main__":
    asyncio.run(main())
