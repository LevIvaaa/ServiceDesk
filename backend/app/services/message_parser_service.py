import json
import logging
import re
from typing import Optional

from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


class ParsedTicketData(BaseModel):
    """Parsed ticket data from customer message."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    station_id: Optional[str] = None  # Station identifier (e.g., "2537", "CH1234")
    station_name: Optional[str] = None  # Station name from message
    operator_name: Optional[str] = None  # Operator name (e.g., "IONITY", "EF")
    station_address: Optional[str] = None  # Full address
    station_city: Optional[str] = None  # City
    port_number: Optional[int] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_email: Optional[str] = None
    vehicle_info: Optional[str] = None  # Vehicle make/model if mentioned


class MessageParserService:
    """Service for parsing customer messages using LLM to extract ticket data."""

    SYSTEM_PROMPT = """Ти - асистент для аналізу повідомлень клієнтів про інциденти на зарядних станціях для електромобілів.

Твоя задача - проаналізувати текст повідомлення від клієнта та витягти всю корисну інформацію для створення тікета.

ТИПОВИЙ ФОРМАТ ПОВІДОМЛЕННЯ:
```
1850 IONITY AC/DC by EF Палац Культури
Дніпропетровська обл. м. Дніпро, просп. С. Нігояна, 47

Тесла 3 (кнопка) 0939030900
авто перезавантажував, положення кнопки міняв.

[OCPP логи...]
```

Де:
- Перший рядок: НОМЕР_СТАНЦІЇ + НАЗВА (напр. "1850 IONITY AC/DC by EF Палац Культури")
  - НОМЕР_СТАНЦІЇ: це ТІЛЬКИ ЧИСЛО на початку (1850, 2537, 1915 тощо)
  - НАЗВА: все інше після числа (включає оператора та локацію)
- Другий рядок: АДРЕСА станції (область, місто, вулиця)
- Далі: інформація про клієнта та опис проблеми
  - Марка авто + телефон клієнта (напр. "Тесла 3 (кнопка) 0939030900")
  - Опис проблеми

Витягни наступні дані:
- station_id: ТІЛЬКИ ЧИСЛО на початку першого рядка (наприклад "1850", "2537", "1915"). НЕ включай назву!
- station_name: Повна назва ПІСЛЯ номера (наприклад "IONITY AC/DC by EF Палац Культури")
- operator_name: Назва оператора/мережі - перше слово після номера, зазвичай IONITY, DTEK, Yasno, тощо
- station_address: Повна адреса з другого рядка (наприклад "Дніпропетровська обл. м. Дніпро, просп. С. Нігояна, 47")
- station_city: Місто з адреси (наприклад "Дніпро", "Київ", "Львів")
- reporter_phone: Телефон клієнта (10 цифр, наприклад "0939030900"). Зазвичай йде поруч з маркою авто
- vehicle_info: Марка/модель автомобіля (наприклад "Tesla Model 3", "VW ID.4", "BMW i3")
- port_number: Номер порту з connectorId в логах (якщо є)
- title: ОБОВ'ЯЗКОВО ЗГЕНЕРУЙ короткий, інформативний заголовок (5-10 слів) на основі опису проблеми. НЕ копіюй перший рядок! Заголовок повинен описувати СУТЬ проблеми, наприклад: "Помилка підключення EV на станції", "Не працює роз'єм CHAdeMO", "Збій комунікації з авто"
- description: Опис проблеми клієнта (без логів OCPP)
- category: "hardware" | "software" | "network" | "billing" | "other"
- priority: "low" | "medium" | "high" | "critical" (EVCommunicationError = high)
- reporter_name: Ім'я клієнта (якщо вказано)
- reporter_email: Email клієнта (якщо вказано)

Важливо:
- station_id - це ТІЛЬКИ ЧИСЛО (1850, 2537), НЕ повна назва!
- operator_name - це мережа зарядок (IONITY, DTEK, Yasno), НЕ EF
- Телефон клієнта зазвичай 10 цифр поруч з маркою авто
- Якщо є OCPP логи з "Faulted" або "EVCommunicationError" - це помилка комунікації, категорія "software", пріоритет "high"
- Відповідай ТІЛЬКИ валідним JSON об'єктом"""

    def __init__(self):
        self._openai = None

    @property
    def openai(self):
        if self._openai is None:
            from openai import AsyncOpenAI
            self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai

    async def parse_message(self, message: str) -> ParsedTicketData:
        """Parse customer message and extract ticket data using LLM."""
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured, using fallback parsing")
            return self._fallback_parse(message)

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": message},
                ],
                temperature=0.1,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM")
                return self._fallback_parse(message)

            data = json.loads(content)
            return ParsedTicketData(**data)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return self._fallback_parse(message)
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return self._fallback_parse(message)

    def _fallback_parse(self, message: str) -> ParsedTicketData:
        """Fallback parsing without LLM using regex patterns."""
        result = ParsedTicketData()

        # Extract phone numbers
        phone_pattern = r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{2,4}[-\s\.]?[0-9]{2,4}[-\s\.]?[0-9]{2,4}'
        phone_match = re.search(phone_pattern, message)
        if phone_match:
            result.reporter_phone = phone_match.group()

        # Extract email
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, message)
        if email_match:
            result.reporter_email = email_match.group()

        # Extract station ID (patterns like CH1234, UA-001, etc.)
        station_pattern = r'\b([A-Z]{1,3}[-]?[0-9]{3,6})\b'
        station_match = re.search(station_pattern, message, re.IGNORECASE)
        if station_match:
            result.station_id = station_match.group(1).upper()

        # Extract port number
        port_pattern = r'порт[а]?\s*[#№]?\s*(\d+)|port\s*[#№]?\s*(\d+)'
        port_match = re.search(port_pattern, message, re.IGNORECASE)
        if port_match:
            result.port_number = int(port_match.group(1) or port_match.group(2))

        # Generate title from message content
        lines = message.strip().split('\n')
        message_lower = message.lower()

        # Try to generate meaningful title based on detected issues
        title_parts = []
        if any(word in message_lower for word in ['evcommunicationerror', 'faulted', 'помилка', 'error']):
            title_parts.append("Помилка")
        if any(word in message_lower for word in ['не працює', 'не заряджає', 'not working']):
            title_parts.append("Не працює")
        if any(word in message_lower for word in ['роз\'єм', 'connector', 'chademo', 'ccs', 'type2']):
            title_parts.append("роз'єм")
        if any(word in message_lower for word in ['комунікація', 'communication', 'підключення', 'connect']):
            title_parts.append("підключення до авто")
        if any(word in message_lower for word in ['зарядка', 'charging', 'заряд']):
            title_parts.append("зарядка")
        if result.station_id:
            title_parts.append(f"на станції {result.station_id}")

        if title_parts:
            result.title = " ".join(title_parts[:4])  # Limit parts
        else:
            # Fallback: use first meaningful line (skip station number line)
            for line in lines[:3]:
                line = line.strip()
                # Skip lines that are just numbers/addresses
                if line and not re.match(r'^\d+\s', line) and not re.match(r'^[А-Яа-яІіЇїЄє]+\s+обл', line):
                    if len(line) > 80:
                        result.title = line[:77] + "..."
                    else:
                        result.title = line
                    break
            if not result.title:
                result.title = lines[0][:80] if lines else "Новий інцидент"

        # Use full message as description
        result.description = message.strip()

        # Default category
        result.category = "other"

        # Try to detect category from keywords
        message_lower = message.lower()
        if any(word in message_lower for word in ['оплата', 'гроші', 'кошти', 'платіж', 'рахунок', 'payment', 'money']):
            result.category = "billing"
        elif any(word in message_lower for word in ['мережа', 'інтернет', 'зв\'язок', 'network', 'connection', 'offline']):
            result.category = "network"
        elif any(word in message_lower for word in ['додаток', 'застосунок', 'app', 'software', 'програма', 'екран', 'помилка']):
            result.category = "software"
        elif any(word in message_lower for word in ['кабель', 'роз\'єм', 'порт', 'зламався', 'пошкоджено', 'hardware', 'broken']):
            result.category = "hardware"

        # Try to detect priority
        result.priority = "medium"
        if any(word in message_lower for word in ['терміново', 'критично', 'не працює', 'urgent', 'critical', 'emergency']):
            result.priority = "high"
        elif any(word in message_lower for word in ['дуже терміново', 'аварія', 'небезпека']):
            result.priority = "critical"

        return result


# Singleton instance
message_parser = MessageParserService()
