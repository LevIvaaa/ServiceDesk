"""Import charge points from chargePoints (12).xlsx - updates existing and creates new stations."""
import asyncio
import sys
import os

# Add parent dirs to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from openpyxl import load_workbook
from sqlalchemy import select
from app.database import async_session_maker
from app.models.operator import Operator
from app.models.station import Station, StationPort


async def main():
    wb = load_workbook('chargePoints (12).xlsx', read_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"Total rows in file: {len(rows)}")

    def safe(row, idx):
        """Safe access to row tuple."""
        if idx < len(row) and row[idx] is not None:
            return str(row[idx]).strip()
        return None

    # Collect unique partners
    partners = set()
    for row in rows:
        partner = safe(row, 13)
        if partner:
            partners.add(partner)

    async with async_session_maker() as session:
        # Ensure all operators exist
        operator_map = {}
        for partner_name in sorted(partners):
            result = await session.execute(
                select(Operator).where(Operator.name == partner_name)
            )
            op = result.scalar_one_or_none()
            if not op:
                code = ''.join(c for c in partner_name if c.isalnum())[:15].upper() or "OP"
                # Ensure unique code
                base_code = code
                counter = 1
                while True:
                    check = await session.execute(select(Operator).where(Operator.code == code))
                    if not check.scalar_one_or_none():
                        break
                    code = f"{base_code}{counter}"
                    counter += 1
                op = Operator(name=partner_name, code=code)
                session.add(op)
                await session.flush()
                print(f"  Created operator: {partner_name} ({code})")
            operator_map[partner_name] = op.id
        await session.commit()
        print(f"Operators ready: {len(operator_map)}")

        # Load all existing stations by identifier
        result = await session.execute(select(Station))
        existing = {s.station_id: s for s in result.scalars().all()}
        print(f"Existing stations in DB: {len(existing)}")

        created = 0
        updated = 0
        skipped = 0

        for row in rows:
            identifier = safe(row, 1)
            if not identifier:
                skipped += 1
                continue

            name = safe(row, 3) or ""
            vendor = safe(row, 5)
            city = safe(row, 6)
            street = safe(row, 8) or ""
            house = safe(row, 9) or ""
            lat_raw = row[10] if 10 < len(row) else None
            lon_raw = row[11] if 11 < len(row) else None
            partner = safe(row, 13)
            kind = safe(row, 35)
            number = safe(row, 2)

            # Parse lat/lon
            lat = None
            lon = None
            try:
                if lat_raw:
                    lat = float(str(lat_raw).replace(',', '.'))
                if lon_raw:
                    lon = float(str(lon_raw).replace(',', '.'))
            except (ValueError, TypeError):
                pass

            address = f"{street} {house}".strip() or None
            operator_id = operator_map.get(partner) if partner else None
            if not operator_id:
                skipped += 1
                continue

            # Parse connectors
            connectors = []
            for i in range(1, 7):
                ct_idx = 39 + (i - 1) * 5
                cs_idx = ct_idx + 1
                ct = safe(row, ct_idx)
                if ct and ct != 'None':
                    cs = safe(row, cs_idx) or 'available'
                    connectors.append({'number': i, 'type': ct, 'status': cs})

            if identifier in existing:
                # Update existing station
                station = existing[identifier]
                changed = False
                if vendor and not station.manufacturer:
                    station.manufacturer = vendor
                    changed = True
                if number and not station.station_number:
                    station.station_number = number
                    changed = True
                if city and not station.city:
                    station.city = city
                    changed = True
                if address and not station.address:
                    station.address = address
                    changed = True
                if lat and not station.latitude:
                    station.latitude = lat
                    changed = True
                if lon and not station.longitude:
                    station.longitude = lon
                    changed = True
                if changed:
                    updated += 1
            else:
                # Create new station
                station = Station(
                    station_id=identifier,
                    station_number=number,
                    name=name or identifier,
                    operator_id=operator_id,
                    city=city,
                    address=address,
                    latitude=lat,
                    longitude=lon,
                    manufacturer=vendor,
                    status='online',
                )
                session.add(station)
                await session.flush()

                # Create ports
                for conn in connectors:
                    port = StationPort(
                        station_id=station.id,
                        port_number=conn['number'],
                        connector_type=conn['type'],
                        status=conn['status'] if conn['status'] != 'None' else 'available',
                    )
                    session.add(port)

                existing[identifier] = station
                created += 1

            if (created + updated) % 500 == 0 and (created + updated) > 0:
                print(f"  Progress: created={created}, updated={updated}")

        await session.commit()
        print(f"\nDone! Created: {created}, Updated: {updated}, Skipped: {skipped}")

    wb.close()


if __name__ == "__main__":
    asyncio.run(main())
