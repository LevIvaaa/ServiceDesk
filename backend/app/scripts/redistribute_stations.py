"""
Redistribute stations among different operators randomly
"""
import asyncio
import random
from sqlalchemy import select
from app.database import async_session_maker
from app.models.station import Station
from app.models.operator import Operator


async def redistribute_stations():
    async with async_session_maker() as db:
        # Get all operators
        result = await db.execute(select(Operator))
        operators = result.scalars().all()
        
        if not operators:
            print("No operators found!")
            return
        
        # Get all stations
        result = await db.execute(select(Station))
        stations = result.scalars().all()
        
        if not stations:
            print("No stations found!")
            return
        
        print(f"Found {len(operators)} operators and {len(stations)} stations")
        print(f"Redistributing stations...\n")
        
        # Randomly assign each station to an operator
        for station in stations:
            operator = random.choice(operators)
            station.operator_id = operator.id
            print(f"Station {station.station_id} -> {operator.name}")
        
        await db.commit()
        
        # Show distribution
        print(f"\n✅ Successfully redistributed {len(stations)} stations!")
        print("\nDistribution:")
        
        result = await db.execute(
            select(Operator.name, Station.id)
            .join(Station, Station.operator_id == Operator.id)
        )
        
        distribution = {}
        for row in result:
            operator_name = row[0]
            distribution[operator_name] = distribution.get(operator_name, 0) + 1
        
        for operator_name, count in sorted(distribution.items(), key=lambda x: x[1], reverse=True):
            print(f"  {operator_name}: {count} станцій")


if __name__ == "__main__":
    asyncio.run(redistribute_stations())
