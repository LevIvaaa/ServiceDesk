import asyncio
import logging
from datetime import datetime, timedelta

from celery import Celery

from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "notifications",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-sla-warnings": {
            "task": "app.notifications.tasks.check_sla_warnings",
            "schedule": 900.0,  # Every 15 minutes
        },
        "send-daily-digest": {
            "task": "app.notifications.tasks.send_daily_digest",
            "schedule": 86400.0,  # Daily
            "options": {"expires": 3600},
        },
    },
)


@celery_app.task
def check_sla_warnings():
    """Check for tickets approaching SLA breach and send warnings."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    loop.run_until_complete(_check_sla_warnings_async())


async def _check_sla_warnings_async():
    """Async implementation of SLA warning check."""
    from sqlalchemy import select

    from app.database import async_session_maker
    from app.models.ticket import Ticket
    from app.services.notification_service import NotificationService

    async with async_session_maker() as db:
        # Find tickets approaching SLA (within 2 hours)
        warning_threshold = datetime.utcnow() + timedelta(hours=2)

        result = await db.execute(
            select(Ticket)
            .where(
                Ticket.sla_due_date.isnot(None),
                Ticket.sla_due_date <= warning_threshold,
                Ticket.sla_breached == False,
                Ticket.status.not_in(["reviewing", "closed"]),
            )
        )
        tickets = result.scalars().all()

        notification_service = NotificationService(db)

        for ticket in tickets:
            await notification_service.notify_sla_warning(ticket)
            logger.info(f"SLA warning sent for ticket {ticket.ticket_number}")


@celery_app.task
def send_daily_digest():
    """Send daily digest of open tickets to department heads."""
    asyncio.run(_send_daily_digest_async())


async def _send_daily_digest_async():
    """Async implementation of daily digest."""
    from sqlalchemy import select, func

    from app.database import async_session_maker
    from app.models.department import Department
    from app.models.ticket import Ticket
    from app.models.user import User, UserNotificationSettings
    from app.notifications.email_sender import EmailSender

    async with async_session_maker() as db:
        # Get all departments with head users
        result = await db.execute(
            select(Department)
            .where(Department.head_user_id.isnot(None), Department.is_active == True)
        )
        departments = result.scalars().all()

        email_sender = EmailSender()

        for dept in departments:
            # Get open tickets for this department
            tickets_result = await db.execute(
                select(func.count())
                .where(
                    Ticket.assigned_department_id == dept.id,
                    Ticket.status.not_in(["reviewing", "closed"]),
                )
            )
            open_count = tickets_result.scalar()

            # Get SLA breached tickets
            sla_result = await db.execute(
                select(func.count())
                .where(
                    Ticket.assigned_department_id == dept.id,
                    Ticket.sla_breached == True,
                    Ticket.status.not_in(["reviewing", "closed"]),
                )
            )
            sla_breached_count = sla_result.scalar()

            if open_count == 0:
                continue

            # Get head user
            head = await db.get(User, dept.head_user_id)
            if not head or not head.email:
                continue

            # Get user notification settings
            settings_result = await db.execute(
                select(UserNotificationSettings)
                .where(UserNotificationSettings.user_id == head.id)
            )
            user_settings = settings_result.scalar_one_or_none()

            if not user_settings or not user_settings.email_enabled:
                continue

            # Send digest email
            template_data = {
                "user_name": head.first_name,
                "department_name": dept.name,
                "open_tickets": open_count,
                "sla_breached": sla_breached_count,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "subject": f"Щоденна зведка: {dept.name}",
            }

            await email_sender.send_templated(
                recipient=head.email,
                template_name="daily_digest",
                template_data=template_data,
                language=user_settings.language,
            )

            logger.info(f"Daily digest sent to {head.email} for department {dept.name}")


@celery_app.task
def update_sla_breached():
    """Update SLA breached status for overdue tickets."""
    asyncio.run(_update_sla_breached_async())


async def _update_sla_breached_async():
    """Async implementation of SLA breach update."""
    from sqlalchemy import select

    from app.database import async_session_maker
    from app.models.ticket import Ticket

    async with async_session_maker() as db:
        now = datetime.utcnow()

        result = await db.execute(
            select(Ticket)
            .where(
                Ticket.sla_due_date.isnot(None),
                Ticket.sla_due_date < now,
                Ticket.sla_breached == False,
                Ticket.status.not_in(["reviewing", "closed"]),
            )
        )
        tickets = result.scalars().all()

        for ticket in tickets:
            ticket.sla_breached = True
            logger.info(f"SLA breached for ticket {ticket.ticket_number}")

        await db.commit()
