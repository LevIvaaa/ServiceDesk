"""
Seed script to populate the database with sample operators.
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.operator import Operator

logger = logging.getLogger(__name__)


async def seed_operators(db: AsyncSession):
    """Create 30+ sample operators."""
    logger.info("Seeding operators...")
    
    operators_data = [
        ("SK.AI Charging Network", "SKAI", "support@skai.ua", "+380443334455"),
        ("EcoCharge Ukraine", "ECOCHG", "info@ecocharge.ua", "+380445556677"),
        ("PowerGrid Solutions", "PWRGRID", "contact@powergrid.ua", "+380447778899"),
        ("GreenEnergy Stations", "GREENENRG", "support@greenenergy.ua", "+380449990011"),
        ("FastCharge Pro", "FASTCHG", "info@fastcharge.ua", "+380441112233"),
        ("UkrElectro Charging", "UKRELEC", "service@ukrelectro.ua", "+380443334444"),
        ("EV Power Network", "EVPOWER", "contact@evpower.ua", "+380445555666"),
        ("ChargePoint Ukraine", "CHRGPNT", "support@chargepoint.ua", "+380447777888"),
        ("ElectroMobility UA", "ELMOB", "info@electromobility.ua", "+380449999000"),
        ("SmartCharge Systems", "SMTCHG", "service@smartcharge.ua", "+380441111222"),
        ("EnergyHub Ukraine", "ENRGHUB", "contact@energyhub.ua", "+380443333444"),
        ("VoltStation Network", "VOLTSTA", "support@voltstation.ua", "+380445555777"),
        ("PowerUp Charging", "PWRUP", "info@powerup.ua", "+380447777999"),
        ("EcoStation Ukraine", "ECOSTA", "service@ecostation.ua", "+380449999111"),
        ("ChargeMaster Pro", "CHRGMST", "contact@chargemaster.ua", "+380441111333"),
        ("ElectricWay Ukraine", "ELECWAY", "support@electricway.ua", "+380443333555"),
        ("GreenVolt Network", "GRNVOLT", "info@greenvolt.ua", "+380445555888"),
        ("PowerLink Stations", "PWRLNK", "service@powerlink.ua", "+380447777000"),
        ("EV Connect Ukraine", "EVCON", "contact@evconnect.ua", "+380449999222"),
        ("ChargeHub Systems", "CHRGHUB", "support@chargehub.ua", "+380441111444"),
        ("EnergyPoint Network", "ENRGPNT", "info@energypoint.ua", "+380443333666"),
        ("VoltCharge Pro", "VOLTCHG", "service@voltcharge.ua", "+380445555999"),
        ("PowerStation Ukraine", "PWRSTA", "contact@powerstation.ua", "+380447777111"),
        ("EcoCharge Pro", "ECOCHGP", "support@ecochargepro.ua", "+380449999333"),
        ("SmartPower Network", "SMTPWR", "info@smartpower.ua", "+380441111555"),
        ("ElectroCharge UA", "ELCHG", "service@electrocharge.ua", "+380443333777"),
        ("GreenCharge Systems", "GRNCHG", "contact@greencharge.ua", "+380445555000"),
        ("PowerHub Ukraine", "PWRHUB", "support@powerhub.ua", "+380447777222"),
        ("EV Station Network", "EVSTA", "info@evstation.ua", "+380449999444"),
        ("ChargeLink Pro", "CHRGLNK", "service@chargelink.ua", "+380441111666"),
        ("EnergyCharge Ukraine", "ENRGCHG", "contact@energycharge.ua", "+380443333888"),
        ("VoltPower Network", "VOLTPWR", "support@voltpower.ua", "+380445555111"),
        ("PowerCharge Systems", "PWRCHG", "info@powercharge.ua", "+380447777333"),
        ("EcoElectric Ukraine", "ECOELEC", "service@ecoelectric.ua", "+380449999555"),
        ("SmartStation Pro", "SMTSTA", "contact@smartstation.ua", "+380441111777"),
    ]
    
    operators_created = 0
    
    for name, code, email, phone in operators_data:
        # Check if operator already exists
        existing = await db.execute(
            select(Operator).where(Operator.code == code)
        )
        if existing.scalar_one_or_none():
            logger.info(f"Operator {code} already exists, skipping")
            continue
        
        operator = Operator(
            name=name,
            code=code,
            contact_email=email,
            contact_phone=phone,
            is_active=True,
        )
        db.add(operator)
        operators_created += 1
        logger.info(f"Created operator: {code} - {name}")
    
    await db.flush()
    logger.info(f"Created {operators_created} operators")


async def main():
    """Main function to run the seeding."""
    logger.info("Starting operators seeding...")
    
    async with async_session_maker() as db:
        try:
            await seed_operators(db)
            await db.commit()
            logger.info("Operators seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"Operators seeding failed: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
