from abc import ABC, abstractmethod
from enum import Enum


class NotificationChannel(str, Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"


class NotificationEvent(str, Enum):
    TICKET_CREATED = "ticket.created"
    TICKET_ASSIGNED = "ticket.assigned"
    TICKET_STATUS_CHANGED = "ticket.status_changed"
    TICKET_COMMENTED = "ticket.commented"
    TICKET_SLA_WARNING = "ticket.sla_warning"
    TICKET_ESCALATED = "ticket.escalated"


class BaseNotificationSender(ABC):
    """Base class for notification senders."""

    @abstractmethod
    async def send(
        self,
        recipient: str,
        subject: str,
        body: str,
        template_data: dict | None = None,
    ) -> bool:
        """Send a notification."""
        pass

    @abstractmethod
    async def send_templated(
        self,
        recipient: str,
        template_name: str,
        template_data: dict,
        language: str = "uk",
    ) -> bool:
        """Send a notification using a template."""
        pass
