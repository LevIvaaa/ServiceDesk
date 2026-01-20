import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from app.config import settings
from app.notifications.base import BaseNotificationSender

logger = logging.getLogger(__name__)


class EmailSender(BaseNotificationSender):
    """Email notification sender using SMTP."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAIL_FROM
        self.from_name = settings.EMAIL_FROM_NAME

        templates_path = Path(__file__).parent / "templates" / "email"
        if templates_path.exists():
            self.template_env = Environment(
                loader=FileSystemLoader(str(templates_path))
            )
        else:
            self.template_env = None

    async def send(
        self,
        recipient: str,
        subject: str,
        body: str,
        template_data: dict | None = None,
    ) -> bool:
        """Send an email."""
        message = MIMEMultipart("alternative")
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = recipient
        message["Subject"] = subject

        message.attach(MIMEText(body, "html", "utf-8"))

        try:
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True,
            )
            logger.info(f"Email sent to {recipient}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Email send error to {recipient}: {e}")
            return False

    async def send_templated(
        self,
        recipient: str,
        template_name: str,
        template_data: dict,
        language: str = "uk",
    ) -> bool:
        """Send an email using a template."""
        if not self.template_env:
            logger.error("Email templates not configured")
            return False

        try:
            template_file = f"{language}/{template_name}.html"
            template = self.template_env.get_template(template_file)
            html_body = template.render(**template_data)
            subject = template_data.get("subject", "SK.AI Service Desk")

            return await self.send(recipient, subject, html_body)
        except Exception as e:
            logger.error(f"Template email error: {e}")
            return False
