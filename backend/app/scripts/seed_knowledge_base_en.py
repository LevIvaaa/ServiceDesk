import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleVersion
from app.models.user import User

logger = logging.getLogger(__name__)

ARTICLES_EN = [
    {
        "title": "What to do if the charging port is not working",
        "content": """## Problem
The charging station port does not respond to electric vehicle connection.

## Diagnostics
1. Check the indicators on the port - are they lit
2. Try connecting another electric vehicle
3. Check if the port is blocked in the system

## Solution
1. Restart the station through the control panel
2. Check power cable connections
3. If the problem persists - create a maintenance ticket

## Error Codes
- E001: No power to port
- E002: Port communication error
- E003: Port blocked""",
        "category": "troubleshooting",
        "tags": ["port", "not working", "charging"],
        "station_models": ["ChargePoint CT4000", "ABB Terra AC"],
        "error_codes": ["E001", "E002", "E003"],
        "language": "en"
    },
    {
        "title": "Error E001: No power to port",
        "content": """## Error Description
The charging station port is not receiving power from the main unit.

## Causes
- Circuit breaker is off
- Damaged power cable
- Internal power supply malfunction

## Troubleshooting Steps
1. Check the status of circuit breakers
2. Visually inspect cable condition
3. Measure voltage at port input (technicians only)
4. Replace power supply if necessary""",
        "category": "troubleshooting",
        "tags": ["error", "power", "E001"],
        "error_codes": ["E001"],
        "language": "en"
    },
    {
        "title": "How to restart the charging station",
        "content": """## When restart is needed
- Station does not respond to commands
- Communication errors
- After software update

## Restart Procedure
1. Make sure no charging is active
2. Log in to the admin panel
3. Select "Maintenance" → "Restart"
4. Confirm the action
5. Wait 2-3 minutes for full boot

## Alternative Method
If panel is unavailable - turn off power for 30 seconds, then turn on again.""",
        "category": "how-to",
        "tags": ["restart", "maintenance"],
        "station_models": ["ChargePoint CT4000", "ABB Terra AC", "EVBox Troniq"],
        "language": "en"
    },
    {
        "title": "Station not connecting to network",
        "content": """## Symptoms
- No connection to central system
- Unable to start charging via app
- Network indicator not lit

## Check
1. Check Ethernet cable (if used)
2. Check Wi-Fi settings
3. Make sure router is working
4. Check internet availability

## Solution
1. Reconnect network cable
2. Restart router
3. Check network settings in station panel
4. Contact IT department to check firewall""",
        "category": "troubleshooting",
        "tags": ["network", "connection", "internet"],
        "error_codes": ["E100", "E101"],
        "language": "en"
    },
    {
        "title": "Error E050: Station overheating",
        "content": """## Description
Internal component temperature exceeded acceptable limits.

## Causes
- High ambient temperature
- Insufficient ventilation
- Cooling system malfunction
- Extended operation at maximum power

## Actions
1. Stop charging
2. Let the station cool for 15-20 minutes
3. Check ventilation openings - are they blocked
4. If error repeats - call a technician""",
        "category": "troubleshooting",
        "tags": ["overheating", "temperature", "cooling"],
        "error_codes": ["E050", "E051"],
        "language": "en"
    },
    {
        "title": "How to add a new RFID card",
        "content": """## Card Addition Procedure
1. Log in to admin panel
2. Go to "Users" section
3. Select user or create new one
4. Click "Add RFID card"
5. Place card on station reader
6. System will automatically read card ID
7. Save changes

## Important
- One card can only be linked to one user
- To remove card use "Delete" button next to card ID""",
        "category": "how-to",
        "tags": ["RFID", "card", "authorization"],
        "station_models": ["ChargePoint CT4000", "ABB Terra AC", "EVBox Troniq"],
        "language": "en"
    },
    {
        "title": "Charging stops after 5 minutes",
        "content": """## Problem
Charging automatically stops shortly after starting.

## Possible Causes
1. Communication issues between station and vehicle
2. Cable malfunction
3. Network overload
4. Time limit settings

## Diagnostics
1. Check station error log
2. Try another port
3. Check charging profile settings
4. Check cable connector condition

## Solution
- Clean connector contacts
- Restart station
- Check timer settings""",
        "category": "troubleshooting",
        "tags": ["stop", "charging", "interruption"],
        "error_codes": ["E020", "E021"],
        "language": "en"
    },
    {
        "title": "How to configure station schedule",
        "content": """## Schedule Configuration
1. Open station web interface
2. Go to "Settings" → "Schedule"
3. Select days of week
4. Set operating hours
5. Save settings

## Additional Options
- Different schedules for weekdays and weekends
- Power limitation during peak hours
- Automatic shutdown during non-working hours

## Note
Active charging sessions will not be interrupted when non-working hours begin.""",
        "category": "how-to",
        "tags": ["schedule", "settings", "working hours"],
        "language": "en"
    },
    {
        "title": "Error E200: RFID reader error",
        "content": """## Error Description
RFID card reader is not working or working incorrectly.

## Symptoms
- Card not recognized
- Reading delay
- Reader indicator not responding

## Solution
1. Restart station
2. Check reader surface cleanliness
3. Try another card
4. Check reader connection (for technicians)
5. Replace reader if necessary

## Temporary Solution
Use mobile app for authorization.""",
        "category": "troubleshooting",
        "tags": ["RFID", "reader", "card"],
        "error_codes": ["E200", "E201", "E202"],
        "language": "en"
    },
    {
        "title": "Low charging speed",
        "content": """## Problem
Charging is slower than expected.

## Causes
1. Station power limitation
2. Vehicle limitation
3. High battery temperature
4. Low grid voltage
5. Charging profile settings

## Check
- View current power on station display
- Check vehicle settings
- Check battery temperature
- Check grid voltage

## Solution
- Wait for battery to cool
- Change charging profile settings
- Check electrical grid""",
        "category": "troubleshooting",
        "tags": ["speed", "slow charging", "power"],
        "language": "en"
    },
    {
        "title": "How to update station firmware",
        "content": """## Preparation
1. Make sure station is connected to internet
2. Make sure no charging is active
3. Backup settings

## Update Process
1. Log in to admin panel
2. Go to "System" → "Updates"
3. Click "Check for updates"
4. If update available - click "Install"
5. Wait for completion (10-15 minutes)
6. Station will restart automatically

## Important
- Do not turn off power during update
- Check all functions after update""",
        "category": "how-to",
        "tags": ["update", "firmware"],
        "station_models": ["ChargePoint CT4000", "ABB Terra AC", "EVBox Troniq"],
        "language": "en"
    },
    {
        "title": "Error E300: Energy measurement error",
        "content": """## Description
Energy meter is not working or showing incorrect data.

## Consequences
- Inaccurate energy consumption accounting
- Unable to generate invoices
- Reporting errors

## Diagnostics
1. Check meter connection
2. Check calibration
3. Compare readings with other sources

## Solution
1. Restart station
2. Perform meter calibration
3. Check system settings
4. Replace meter if necessary""",
        "category": "troubleshooting",
        "tags": ["meter", "energy", "accounting"],
        "error_codes": ["E300", "E301", "E302"],
        "language": "en"
    },
    {
        "title": "How to configure charging tariffs",
        "content": """## Tariff Configuration
1. Log in to management system
2. Go to "Settings" → "Tariffs"
3. Create new tariff or edit existing
4. Set price per kWh
5. Configure different tariffs for different times of day
6. Save changes

## Tariff Types
- Fixed (same price always)
- Hourly (different price at different times)
- Preferential (for certain user groups)

## Application
Tariffs are applied automatically when charging starts.""",
        "category": "how-to",
        "tags": ["tariffs", "prices", "payment"],
        "language": "en"
    },
    {
        "title": "Station does not authorize user",
        "content": """## Problem
User cannot start charging due to authorization error.

## Causes
1. Card not registered in system
2. Account blocked
3. Insufficient balance
4. Connection issues with authorization server

## Check
- Check account status
- Check user balance
- Check internet connection
- Review error log

## Solution
1. Make sure card is active
2. Top up balance
3. Check network connection
4. Use alternative authorization method""",
        "category": "troubleshooting",
        "tags": ["authorization", "user", "access"],
        "error_codes": ["E400", "E401", "E402"],
        "language": "en"
    },
    {
        "title": "How to view charging history",
        "content": """## Access History
1. Log in to admin panel
2. Go to "Reports" section
3. Select "Charging History"
4. Set filters (date, user, station)
5. Click "Show"

## Available Information
- Start/end date and time
- Charging duration
- Energy consumed
- Cost
- User
- Station and port

## Data Export
History can be exported in CSV, Excel, PDF formats.""",
        "category": "how-to",
        "tags": ["history", "reports", "statistics"],
        "language": "en"
    },
    {
        "title": "Error E500: Communication error with vehicle",
        "content": """## Description
Station cannot establish connection with vehicle.

## Symptoms
- Charging does not start
- Error message on display
- Vehicle does not recognize station

## Causes
1. Dirty connector contacts
2. Damaged cable
3. Protocol incompatibility
4. Vehicle issue

## Solution
1. Clean connector contacts
2. Try another cable/port
3. Restart station
4. Restart vehicle system
5. Check vehicle model compatibility""",
        "category": "troubleshooting",
        "tags": ["communication", "vehicle", "connection"],
        "error_codes": ["E500", "E501", "E502"],
        "language": "en"
    },
    {
        "title": "How to configure notifications",
        "content": """## Notification Types
- Email notifications
- SMS notifications
- Push notifications in app
- Telegram notifications

## Configuration
1. Log in to personal account
2. Go to "Settings" → "Notifications"
3. Select events for notifications:
   - Charging start
   - Charging complete
   - Errors
   - Low balance
4. Select delivery channels
5. Save settings

## Recommendations
Enable error notifications for quick response.""",
        "category": "how-to",
        "tags": ["notifications", "settings", "alerts"],
        "language": "en"
    },
    {
        "title": "Station display not working",
        "content": """## Problem
Station display shows no information or displays incorrectly.

## Diagnostics
1. Check if backlight is on
2. Check if touchscreen responds
3. Try restarting station

## Possible Causes
- Software failure
- Display damage
- Connection issues
- Controller malfunction

## Solution
1. Restart station
2. Check display cable connection
3. Update firmware
4. Replace display if necessary

## Temporary Solution
Use mobile app or web interface.""",
        "category": "troubleshooting",
        "tags": ["display", "screen", "interface"],
        "error_codes": ["E600", "E601"],
        "language": "en"
    },
    {
        "title": "How to create usage report",
        "content": """## Report Creation
1. Log in to management system
2. Go to "Reports" → "Usage"
3. Select reporting period
4. Select stations to include in report
5. Select report format (PDF, Excel, CSV)
6. Click "Create Report"

## Report Data
- Total number of charges
- Energy consumed
- Revenue
- Average charging duration
- Most active users
- Usage graphs

## Automatic Reports
Can configure automatic email report delivery.""",
        "category": "how-to",
        "tags": ["reports", "statistics", "analytics"],
        "language": "en"
    },
    {
        "title": "Error E700: Ground fault",
        "content": """## WARNING! DANGEROUS ERROR
Current leakage detected, which may pose a danger.

## Actions
1. IMMEDIATELY stop using the station
2. Disconnect power
3. Cordon off access area
4. Call qualified electrician

## Causes
- Insulation damage
- Moisture penetration
- Protective equipment malfunction

## Important
DO NOT attempt to fix the problem yourself!
This can be life-threatening!""",
        "category": "troubleshooting",
        "tags": ["leakage", "safety", "emergency"],
        "error_codes": ["E700", "E701"],
        "language": "en"
    },
    {
        "title": "How to configure charging time reservation",
        "content": """## Reservation Feature
Allows users to book charging time in advance.

## Administrator Configuration
1. Log in to control panel
2. Go to "Settings" → "Reservations"
3. Enable reservation feature
4. Set minimum/maximum reservation time
5. Set reservation cost (optional)
6. Save settings

## For Users
1. Open app
2. Select station
3. Click "Reserve"
4. Select date and time
5. Confirm reservation""",
        "category": "how-to",
        "tags": ["reservation", "booking", "time"],
        "language": "en"
    },
    {
        "title": "Station not responding to app commands",
        "content": """## Problem
Unable to control station via mobile app or web interface.

## Check
1. Check internet connection on device
2. Check station network connection
3. Check server status in app
4. Try logging out and back in

## Solution
1. Restart app
2. Check station network settings
3. Restart station
4. Check firewall and ports
5. Contact support

## Temporary Solution
Use local control via station display.""",
        "category": "troubleshooting",
        "tags": ["app", "control", "commands"],
        "error_codes": ["E800", "E801"],
        "language": "en"
    },
    {
        "title": "How to configure payment system integration",
        "content": """## Supported Payment Systems
- Visa/Mastercard
- Apple Pay / Google Pay
- PayPal
- Local payment systems

## Configuration
1. Log in to control panel
2. Go to "Settings" → "Payments"
3. Select payment system
4. Enter API keys from payment provider
5. Configure currency
6. Test connection
7. Save settings

## Security
All payment data is encrypted and complies with PCI DSS standard.""",
        "category": "how-to",
        "tags": ["payments", "billing", "integration"],
        "language": "en"
    },
    {
        "title": "Error E900: Network overload",
        "content": """## Description
Energy consumption exceeds acceptable limits.

## Causes
1. Simultaneous charging of many vehicles
2. Insufficient electrical grid capacity
3. Incorrect load distribution settings

## Consequences
- Automatic charging power reduction
- Possible port disconnection
- Increased charging time

## Solution
1. Configure dynamic load distribution
2. Limit number of simultaneous charges
3. Consider increasing connection capacity
4. Use smart charging scheduling""",
        "category": "troubleshooting",
        "tags": ["overload", "power", "load"],
        "error_codes": ["E900", "E901"],
        "language": "en"
    },
    {
        "title": "How to configure dynamic load distribution",
        "content": """## What is Dynamic Load Distribution
Automatic charging power regulation for optimal use of available electricity.

## Configuration
1. Log in to control panel
2. Go to "Settings" → "Load Management"
3. Enable dynamic distribution
4. Set maximum available power
5. Set port priorities (optional)
6. Save settings

## Benefits
- Prevents overload
- Optimal energy use
- Ability to charge more vehicles""",
        "category": "how-to",
        "tags": ["load", "distribution", "optimization"],
        "language": "en"
    },
    {
        "title": "Cable stuck in connector",
        "content": """## Problem
Charging cable does not come out of vehicle or station connector.

## Causes
1. Active lock during charging
2. Mechanical lock malfunction
3. Freezing in cold weather
4. Software failure

## Solution
1. Make sure charging is complete
2. Unlock vehicle
3. Try unlocking via app
4. For station - use emergency unlock
5. In cold weather - wait for thawing

## Emergency Unlock
Use special key (usually included with station).""",
        "category": "troubleshooting",
        "tags": ["cable", "stuck", "lock"],
        "language": "en"
    },
    {
        "title": "How to configure user groups",
        "content": """## Group Purpose
Groups allow managing access and tariffs for different user categories.

## Group Creation
1. Log in to control panel
2. Go to "Users" → "Groups"
3. Click "Create Group"
4. Enter name and description
5. Set access rights
6. Assign tariff
7. Save group

## Adding Users
1. Open user profile
2. Select group from list
3. Save changes

## Group Examples
- Employees
- VIP clients
- Guests
- Test users""",
        "category": "how-to",
        "tags": ["groups", "users", "access"],
        "language": "en"
    },
    {
        "title": "Error E1000: Contactor malfunction",
        "content": """## Description
Contactor (high power relay) does not operate or operates incorrectly.

## Symptoms
- Clicking when trying to start charging
- Charging does not start
- Intermittent power supply

## Causes
1. Contact wear
2. Coil issues
3. Overheating
4. Mechanical damage

## Actions
1. Stop using station
2. Restart station
3. If error repeats - call technician
4. Contactor needs replacement

## Important
Faulty contactor can cause fire!""",
        "category": "troubleshooting",
        "tags": ["contactor", "relay", "malfunction"],
        "error_codes": ["E1000", "E1001"],
        "language": "en"
    },
    {
        "title": "How to perform station diagnostics",
        "content": """## Diagnostics Mode
1. Log in to admin panel
2. Go to "Maintenance" → "Diagnostics"
3. Select diagnostics type:
   - Quick check
   - Full diagnostics
   - Individual component test
4. Run diagnostics
5. Wait for completion

## What is Checked
- Power and voltage
- Communication modules
- Energy meter
- RFID reader
- Contactors
- Temperature sensors
- Network connection

## Results
Diagnostics report can be saved or sent to support.""",
        "category": "how-to",
        "tags": ["diagnostics", "testing", "check"],
        "language": "en"
    },
    {
        "title": "Station shows incorrect time",
        "content": """## Problem
Time on station does not match real time.

## Causes
1. No connection to NTP server
2. Incorrect time zone
3. Clock battery discharged
4. Software failure

## Solution
1. Check internet connection
2. Configure NTP server:
   - Control panel → System → Date & Time
   - Enable automatic synchronization
   - Specify NTP server (e.g., pool.ntp.org)
3. Set correct time zone
4. Save settings

## Importance of Correct Time
Incorrect time affects billing and reporting.""",
        "category": "troubleshooting",
        "tags": ["time", "date", "synchronization"],
        "language": "en"
    },
    {
        "title": "How to configure backup",
        "content": """## What is Backed Up
- Station settings
- User database
- Charging history
- Event logs
- Tariffs and groups

## Automatic Backup Configuration
1. Log in to control panel
2. Go to "System" → "Backup"
3. Enable automatic backup
4. Set schedule (daily, weekly)
5. Select storage location (local, cloud, FTP)
6. Save settings

## Restore from Backup
1. System → Backup → Restore
2. Select backup file
3. Confirm restore
4. Wait for completion""",
        "category": "how-to",
        "tags": ["backup", "restore"],
        "language": "en"
    },
    {
        "title": "Error E1100: Protocol version mismatch",
        "content": """## Description
Vehicle charging protocol version is not compatible with station.

## Causes
1. Outdated station firmware
2. Very new vehicle with new protocol
3. Regional differences in standards

## Solution
1. Update station firmware to latest version
2. Check vehicle model compatibility
3. Try another station
4. Contact manufacturer for compatibility clarification

## Supported Protocols
- IEC 61851
- ISO 15118
- CHAdeMO
- CCS (Combined Charging System)""",
        "category": "troubleshooting",
        "tags": ["protocol", "compatibility", "version"],
        "error_codes": ["E1100", "E1101"],
        "language": "en"
    },
    {
        "title": "How to configure station monitoring",
        "content": """## Monitoring System
Allows tracking status of all stations in real time.

## Configuration
1. Log in to control panel
2. Go to "Monitoring" → "Settings"
3. Enable monitoring
4. Configure tracking parameters:
   - Connection status
   - Active charges
   - Errors and warnings
   - Energy consumption
5. Configure critical event notifications
6. Save settings

## Monitoring Dashboard
Shows:
- Station map
- Each station status
- Current charges
- Real-time statistics""",
        "category": "how-to",
        "tags": ["monitoring", "tracking", "control"],
        "language": "en"
    },
    {
        "title": "Charging completes with payment error",
        "content": """## Problem
Charging completes successfully, but error occurs when charging funds.

## Causes
1. Insufficient balance
2. Payment system issues
3. Blocked card
4. Tariff settings error

## Check
1. Check user balance
2. Check payment system status
3. Review transaction log
4. Check tariff settings

## Solution
1. Top up balance
2. Update payment details
3. Check payment system connection
4. Retry charging""",
        "category": "troubleshooting",
        "tags": ["payment", "billing", "balance"],
        "error_codes": ["E1200", "E1201"],
        "language": "en"
    },
    {
        "title": "How to configure scheduled access",
        "content": """## Time-based Access Restriction
Allows controlling when users can use stations.

## Configuration for User Group
1. Log in to control panel
2. Go to "Users" → "Groups"
3. Select group or create new
4. Go to "Access Schedule" tab
5. Set allowed hours for each day of week
6. Save settings

## Configuration for Individual Station
1. Go to "Stations"
2. Select station
3. "Access" tab
4. Configure operating schedule
5. Save

## Usage Examples
- Restrict guest access to working hours
- Priority access for employees""",
        "category": "how-to",
        "tags": ["access", "schedule", "restrictions"],
        "language": "en"
    },
    {
        "title": "Frequently Asked Questions about EV Charging",
        "content": """## How long does charging take?
Depends on:
- Vehicle battery capacity
- Station power
- Current charge level
Usually: 30 minutes - 8 hours

## Can I leave vehicle charging overnight?
Yes, modern vehicles and stations automatically stop charging at 100%.

## Is it safe to charge in rain?
Yes, charging stations have moisture protection (IP54 or higher).

## What is AC and DC charging?
- AC (alternating current) - slow charging, 3-22 kW
- DC (direct current) - fast charging, 50-350 kW

## Can I use any station?
Yes, if connector fits your vehicle.""",
        "category": "faq",
        "tags": ["FAQ", "questions", "charging"],
        "language": "en"
    },
]


async def seed_knowledge_base_en():
    """Seed knowledge base with English articles."""
    logger.info("Starting English knowledge base seeding...")

    async with async_session_maker() as db:
        try:
            # Get admin user
            result = await db.execute(
                select(User).where(User.email == "admin@skai.ua")
            )
            admin = result.scalar_one_or_none()

            if not admin:
                logger.error("Admin user not found. Please run seed_initial_data first.")
                return

            # Create articles
            created_count = 0
            for article_data in ARTICLES_EN:
                # Check if article already exists
                existing = await db.execute(
                    select(KnowledgeArticle).where(
                        KnowledgeArticle.title == article_data["title"],
                        KnowledgeArticle.language == "en"
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Article '{article_data['title']}' already exists, skipping")
                    continue

                article = KnowledgeArticle(
                    author_id=admin.id,
                    is_published=True,
                    **article_data
                )
                db.add(article)
                await db.flush()

                # Create initial version
                version = KnowledgeArticleVersion(
                    article_id=article.id,
                    version=1,
                    title=article.title,
                    content=article.content,
                    editor_id=admin.id,
                )
                db.add(version)
                created_count += 1

            await db.commit()
            logger.info(f"Created {created_count} English knowledge base articles!")

        except Exception as e:
            await db.rollback()
            logger.error(f"English knowledge base seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_knowledge_base_en())
