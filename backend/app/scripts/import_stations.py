"""
Script to import stations and operators from CSV file.
Usage: python -m app.scripts.import_stations path/to/chargePoints.csv
"""
import asyncio
import csv
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.station import Station, StationPort
from app.models.operator import Operator


async def import_data(csv_path: str):
    """Import stations and operators from CSV file."""

    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Track created operators
    operators_map = {}  # partnerPk -> operator_id

    stations_created = 0
    operators_created = 0
    stations_updated = 0
    ports_created = 0

    async with async_session() as db:
        # First, create a default operator for stations without partner
        result = await db.execute(
            select(Operator).where(Operator.code == "UNKNOWN")
        )
        default_operator = result.scalar_one_or_none()
        if not default_operator:
            default_operator = Operator(
                name="Unknown Operator",
                code="UNKNOWN",
                is_active=True,
            )
            db.add(default_operator)
            await db.flush()
            operators_created += 1
            print(f"Created default operator: Unknown Operator (ID: {default_operator.id})")

        default_operator_id = default_operator.id

        # Read CSV file
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            # CSV uses semicolon as delimiter
            reader = csv.DictReader(f, delimiter=';')

            rows = list(reader)
            total_rows = len(rows)
            print(f"Found {total_rows} stations in CSV")

            for i, row in enumerate(rows):
                try:
                    # Extract partner (operator) info
                    partner_name = row.get('partner', '').strip()
                    partner_pk = row.get('partnerPk', '').strip()

                    operator_id = default_operator_id

                    if partner_name and partner_pk:
                        # Create or get operator
                        if partner_pk not in operators_map:
                            # Check if operator exists
                            result = await db.execute(
                                select(Operator).where(Operator.code == f"PARTNER_{partner_pk}")
                            )
                            existing_operator = result.scalar_one_or_none()

                            if existing_operator:
                                operators_map[partner_pk] = existing_operator.id
                            else:
                                # Create new operator
                                operator = Operator(
                                    name=partner_name,
                                    code=f"PARTNER_{partner_pk}",
                                    is_active=True,
                                )
                                db.add(operator)
                                await db.flush()
                                operators_map[partner_pk] = operator.id
                                operators_created += 1
                                print(f"  Created operator: {partner_name} (ID: {operator.id})")

                        operator_id = operators_map.get(partner_pk, default_operator_id)

                    # Extract station info
                    # identifier = billing system ID (e.g., EFC002189)
                    # number = operator's station number (e.g., 2189)
                    station_pk = row.get('pk', '').strip()
                    station_identifier = row.get('identifier', '').strip()  # Billing ID
                    station_number = row.get('number', '').strip()  # Operator's ID
                    station_name = row.get('name', '').strip()

                    # Use identifier as primary station_id, fallback to pk
                    primary_id = station_identifier or station_pk
                    if not primary_id:
                        print(f"  Skipping row {i+1}: no station number")
                        continue

                    city = row.get('city', '').strip()
                    street = row.get('street', '').strip()
                    house_number = row.get('houseNumber', '').strip()

                    # Build address
                    address_parts = []
                    if street:
                        address_parts.append(street)
                    if house_number:
                        address_parts.append(house_number)
                    address = ', '.join(address_parts) if address_parts else None

                    # Coordinates
                    lat_str = row.get('latitude', '').strip().replace(',', '.')
                    lon_str = row.get('longitude', '').strip().replace(',', '.')
                    latitude = float(lat_str) if lat_str else None
                    longitude = float(lon_str) if lon_str else None

                    # Station status
                    mode = row.get('mode', '').strip()
                    online = row.get('online', '').strip().lower() == 'true'
                    status = 'online' if online else 'offline'
                    if mode != 'active':
                        status = 'inactive'

                    # Station kind (AC/DC)
                    kind = row.get('kind', '').strip()

                    # Check if station exists (by billing ID)
                    result = await db.execute(
                        select(Station).where(Station.station_id == primary_id)
                    )
                    existing_station = result.scalar_one_or_none()

                    if existing_station:
                        # Update existing station
                        existing_station.name = station_name or existing_station.name
                        existing_station.city = city or existing_station.city
                        existing_station.address = address or existing_station.address
                        existing_station.latitude = latitude
                        existing_station.longitude = longitude
                        existing_station.status = status
                        existing_station.operator_id = operator_id
                        existing_station.external_id = station_number or existing_station.external_id
                        if kind:
                            existing_station.model = kind
                        station = existing_station
                        stations_updated += 1
                    else:
                        # Create new station
                        station = Station(
                            station_id=primary_id,  # Billing ID (e.g., EFC002189)
                            external_id=station_number or None,  # Operator's ID (e.g., 2189)
                            name=station_name or f"Station {primary_id}",
                            operator_id=operator_id,
                            address=address,
                            city=city,
                            latitude=latitude,
                            longitude=longitude,
                            model=kind or None,
                            status=status,
                        )
                        db.add(station)
                        await db.flush()
                        stations_created += 1

                    # Create ports (connectors) - only type and power, NO status
                    for port_num in range(1, 7):  # Up to 6 connectors
                        conn_type = row.get(f'connector{port_num}type', '').strip()

                        if not conn_type:
                            continue

                        # Check if port exists
                        result = await db.execute(
                            select(StationPort).where(
                                StationPort.station_id == station.id,
                                StationPort.port_number == port_num
                            )
                        )
                        existing_port = result.scalar_one_or_none()

                        if not existing_port:
                            port = StationPort(
                                station_id=station.id,
                                port_number=port_num,
                                connector_type=conn_type,
                                status='unknown',  # Always unknown, no status from CSV
                            )
                            db.add(port)
                            ports_created += 1

                    if (i + 1) % 100 == 0:
                        print(f"  Processed {i + 1}/{total_rows} stations...")
                        await db.commit()

                except Exception as e:
                    print(f"  Error processing row {i+1}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

            # Final commit
            await db.commit()

    print(f"\n=== Import Complete ===")
    print(f"Operators created: {operators_created}")
    print(f"Stations created: {stations_created}")
    print(f"Stations updated: {stations_updated}")
    print(f"Ports created: {ports_created}")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.scripts.import_stations <csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]
    if not Path(csv_file).exists():
        print(f"Error: File not found: {csv_file}")
        sys.exit(1)

    print(f"Importing stations from: {csv_file}")
    asyncio.run(import_data(csv_file))
