import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.config import settings
from app.notifications.base import BaseNotificationSender

logger = logging.getLogger(__name__)


class TelegramSender(BaseNotificationSender):
    """Telegram notification sender using aiogram."""

    def __init__(self):
        self._bot = None
        templates_path = Path(__file__).parent / "templates" / "telegram"
        if templates_path.exists():
            self.template_env = Environment(
                loader=FileSystemLoader(str(templates_path))
            )
        else:
            self.template_env = None

    @property
    def bot(self):
        if self._bot is None and settings.TELEGRAM_BOT_TOKEN:
            from aiogram import Bot
            self._bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        return self._bot

    async def send(
        self,
        recipient: str,  # chat_id
        subject: str,
        body: str,
        template_data: dict | None = None,
    ) -> bool:
        """Send a Telegram message."""
        if not self.bot:
            logger.error("Telegram bot not configured")
            return False

        try:
            from aiogram.enums import ParseMode
            await self.bot.send_message(
                chat_id=recipient,
                text=f"*{subject}*\n\n{body}",
                parse_mode=ParseMode.MARKDOWN,
            )
            logger.info(f"Telegram message sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Telegram send error to {recipient}: {e}")
            return False

    async def send_templated(
        self,
        recipient: str,
        template_name: str,
        template_data: dict,
        language: str = "uk",
    ) -> bool:
        """Send a Telegram message using a template."""
        if not self.template_env:
            logger.error("Telegram templates not configured")
            return False

        if not self.bot:
            logger.error("Telegram bot not configured")
            return False

        try:
            from aiogram.enums import ParseMode

            template_file = f"{language}/{template_name}.txt"
            template = self.template_env.get_template(template_file)
            text = template.render(**template_data)

            await self.bot.send_message(
                chat_id=recipient,
                text=text,
                parse_mode=ParseMode.MARKDOWN,
            )
            logger.info(f"Telegram template message sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Telegram template error: {e}")
            return False
