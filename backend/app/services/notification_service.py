import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.department import Department
from app.models.ticket import Ticket
from app.models.user import User, UserNotificationSettings
from app.models.notification import Notification
from app.notifications.base import NotificationEvent
from app.notifications.email_sender import EmailSender
from app.notifications.telegram_sender import TelegramSender

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_sender = EmailSender()
        self.telegram_sender = TelegramSender()

    async def notify_ticket_created(self, ticket: Ticket):
        """Notify about new ticket creation."""
        recipients = await self._get_recipients(ticket, NotificationEvent.TICKET_CREATED)

        template_data = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "priority": ticket.priority,
            "category": ticket.category,
            "station": ticket.station.station_number if ticket.station else None,
            "created_by": f"{ticket.created_by.first_name} {ticket.created_by.last_name}",
            "url": f"{settings.FRONTEND_URL}/tickets/{ticket.id}",
            "subject": f"Новий тікет #{ticket.ticket_number}",
        }

        await self._send_notifications(recipients, "ticket_created", template_data)

    async def notify_ticket_assigned(self, ticket: Ticket, assigned_to: User):
        """Notify user about ticket assignment."""
        # Always save notification to database
        notification = Notification(
            user_id=assigned_to.id,
            ticket_id=ticket.id,
            type="ticket_assigned",
            title=f"Вам призначено тікет #{ticket.ticket_number}",
            message=f"Вам призначено тікет \"{ticket.title}\" (пріоритет: {self._translate_priority(ticket.priority)})",
        )
        self.db.add(notification)
        await self.db.commit()

        # Check if user wants external notifications
        user_settings = await self._get_user_notification_settings(assigned_to.id)

        if not user_settings:
            return

        if not user_settings.notify_ticket_assigned:
            return

        template_data = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "priority": ticket.priority,
            "url": f"{settings.FRONTEND_URL}/tickets/{ticket.id}",
            "subject": f"Вам призначено тікет #{ticket.ticket_number}",
            "user_name": assigned_to.first_name,
        }

        await self._send_to_user(assigned_to, user_settings, "ticket_assigned", template_data)

    async def notify_ticket_status_changed(
        self,
        ticket: Ticket,
        old_status: str,
        new_status: str,
        changed_by: User,
    ):
        """Notify about ticket status change."""
        recipients = await self._get_recipients(ticket, NotificationEvent.TICKET_STATUS_CHANGED)

        template_data = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "old_status": self._translate_status(old_status),
            "new_status": self._translate_status(new_status),
            "changed_by": f"{changed_by.first_name} {changed_by.last_name}",
            "url": f"{settings.FRONTEND_URL}/tickets/{ticket.id}",
            "subject": f"Статус тікету #{ticket.ticket_number} змінено",
        }

        await self._send_notifications(recipients, "ticket_status_changed", template_data)

    async def notify_ticket_commented(self, ticket: Ticket, comment_by: User, is_internal: bool):
        """Notify about new comment on ticket."""
        if is_internal:
            # Only notify assigned user and department head for internal comments
            recipients = []
            if ticket.assigned_user_id:
                user_settings = await self._get_user_notification_settings(ticket.assigned_user_id)
                if user_settings and user_settings.notify_ticket_commented:
                    user = await self.db.get(User, ticket.assigned_user_id)
                    recipients.append((user, user_settings))
        else:
            recipients = await self._get_recipients(ticket, NotificationEvent.TICKET_COMMENTED)

        template_data = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "comment_by": f"{comment_by.first_name} {comment_by.last_name}",
            "url": f"{settings.FRONTEND_URL}/tickets/{ticket.id}",
            "subject": f"Новий коментар до тікету #{ticket.ticket_number}",
        }

        await self._send_notifications(recipients, "ticket_comment", template_data)

    async def notify_sla_warning(self, ticket: Ticket):
        """Notify about upcoming SLA breach."""
        recipients = await self._get_recipients(ticket, NotificationEvent.TICKET_SLA_WARNING)

        template_data = {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "sla_due_date": ticket.sla_due_date.strftime("%Y-%m-%d %H:%M") if ticket.sla_due_date else "",
            "url": f"{settings.FRONTEND_URL}/tickets/{ticket.id}",
            "subject": f"Попередження SLA: тікет #{ticket.ticket_number}",
        }

        await self._send_notifications(recipients, "ticket_sla_warning", template_data)

    async def _get_recipients(
        self,
        ticket: Ticket,
        event: NotificationEvent,
    ) -> list[tuple[User, UserNotificationSettings]]:
        """Get list of recipients for an event."""
        recipients = []

        # Ticket creator
        if ticket.created_by_id:
            user_settings = await self._get_user_notification_settings(ticket.created_by_id)
            if user_settings and self._should_notify(user_settings, event):
                recipients.append((ticket.created_by, user_settings))

        # Assigned user
        if ticket.assigned_user_id and ticket.assigned_user_id != ticket.created_by_id:
            user_settings = await self._get_user_notification_settings(ticket.assigned_user_id)
            if user_settings and self._should_notify(user_settings, event):
                user = await self.db.get(User, ticket.assigned_user_id)
                recipients.append((user, user_settings))

        # Department head
        if ticket.assigned_department_id:
            dept = await self.db.get(Department, ticket.assigned_department_id)
            if dept and dept.head_user_id:
                if dept.head_user_id not in [ticket.created_by_id, ticket.assigned_user_id]:
                    user_settings = await self._get_user_notification_settings(dept.head_user_id)
                    if user_settings and self._should_notify(user_settings, event):
                        head = await self.db.get(User, dept.head_user_id)
                        recipients.append((head, user_settings))

        return recipients

    async def _get_user_notification_settings(
        self, user_id: int
    ) -> Optional[UserNotificationSettings]:
        """Get notification settings for a user."""
        result = await self.db.execute(
            select(UserNotificationSettings).where(
                UserNotificationSettings.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    def _should_notify(
        self, settings: UserNotificationSettings, event: NotificationEvent
    ) -> bool:
        """Check if user should be notified for this event."""
        event_settings = {
            NotificationEvent.TICKET_CREATED: settings.notify_ticket_created,
            NotificationEvent.TICKET_ASSIGNED: settings.notify_ticket_assigned,
            NotificationEvent.TICKET_STATUS_CHANGED: settings.notify_ticket_status_changed,
            NotificationEvent.TICKET_COMMENTED: settings.notify_ticket_commented,
            NotificationEvent.TICKET_SLA_WARNING: settings.notify_ticket_sla_warning,
            NotificationEvent.TICKET_ESCALATED: settings.notify_ticket_escalated,
        }
        return event_settings.get(event, True)

    async def _send_notifications(
        self,
        recipients: list[tuple[User, UserNotificationSettings]],
        template_name: str,
        template_data: dict,
    ):
        """Send notifications to all recipients."""
        for user, user_settings in recipients:
            await self._send_to_user(user, user_settings, template_name, template_data)

    async def _send_to_user(
        self,
        user: User,
        user_settings: UserNotificationSettings,
        template_name: str,
        template_data: dict,
    ):
        """Send notification to a specific user."""
        # Add user name to template data
        template_data["user_name"] = user.first_name

        # Email
        if user_settings.email_enabled and user.email:
            await self.email_sender.send_templated(
                recipient=user.email,
                template_name=template_name,
                template_data=template_data,
                language=user_settings.language,
            )

        # Telegram
        if user_settings.telegram_enabled and user_settings.telegram_chat_id:
            await self.telegram_sender.send_templated(
                recipient=user_settings.telegram_chat_id,
                template_name=template_name,
                template_data=template_data,
                language=user_settings.language,
            )

    def _translate_status(self, status: str) -> str:
        """Translate status to Ukrainian."""
        translations = {
            "new": "Новий",
            "open": "Відкритий",
            "in_progress": "В роботі",
            "pending": "Очікування",
            "resolved": "Вирішено",
            "closed": "Закритий",
        }
        return translations.get(status, status)

    def _translate_priority(self, priority: str) -> str:
        """Translate priority to Ukrainian."""
        translations = {
            "low": "Низький",
            "medium": "Середній",
            "high": "Високий",
            "critical": "Критичний",
        }
        return translations.get(priority, priority)
