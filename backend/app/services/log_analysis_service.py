import logging
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class LogAnalysisService:
    """Service for analyzing station logs using LLM."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def analyze_log(self, log_content: str, language: str = "uk") -> dict:
        """
        Analyze station log content using GPT.

        Returns:
            dict with keys:
            - analysis: str - human-readable analysis
            - error_codes: list[str] - detected error codes
            - status: str - station/connector status
            - recommendations: list[str] - suggested actions
        """
        if not self.client:
            logger.warning("OpenAI API key not configured")
            return {
                "analysis": "AI analysis is not available. OpenAI API key not configured.",
                "error_codes": [],
                "status": "unknown",
                "recommendations": [],
            }

        # Truncate log if too long (keep first and last parts)
        max_chars = 15000
        if len(log_content) > max_chars:
            half = max_chars // 2
            log_content = log_content[:half] + "\n\n... [LOG TRUNCATED] ...\n\n" + log_content[-half:]

        system_prompt = self._get_system_prompt(language)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze this charging station log:\n\n{log_content}"},
                ],
                temperature=0.3,
                max_tokens=2000,
            )

            analysis_text = response.choices[0].message.content or ""

            # Parse the response
            return self._parse_analysis(analysis_text, language)

        except Exception as e:
            logger.error(f"Failed to analyze log: {e}")
            return {
                "analysis": f"Failed to analyze log: {str(e)}",
                "error_codes": [],
                "status": "error",
                "recommendations": [],
            }

    def _get_system_prompt(self, language: str) -> str:
        """Get system prompt for log analysis."""
        if language == "uk":
            return """Ви експерт з аналізу логів зарядних станцій для електромобілів (OCPP протокол).

Проаналізуйте наданий лог і надайте:

1. **АНАЛІЗ**: Короткий опис того, що відбувається в логу (2-5 речень). Вкажіть:
   - Тип станції/конектора якщо видно
   - Послідовність подій
   - Проблеми або помилки

2. **КОДИ ПОМИЛОК**: Список знайдених кодів помилок (наприклад: ConnectorLockFailure, GroundFailure, EVCommunicationError)

3. **СТАТУС**: Поточний статус станції/конектора (Available, Preparing, Charging, SuspendedEV, SuspendedEVSE, Finishing, Reserved, Unavailable, Faulted)

4. **РЕКОМЕНДАЦІЇ**: 2-4 конкретні рекомендації щодо вирішення проблеми

Формат відповіді:
---АНАЛІЗ---
[текст аналізу]

---КОДИ_ПОМИЛОК---
[код1]
[код2]

---СТАТУС---
[статус]

---РЕКОМЕНДАЦІЇ---
- [рекомендація 1]
- [рекомендація 2]
"""
        else:
            return """You are an expert in analyzing EV charging station logs (OCPP protocol).

Analyze the provided log and provide:

1. **ANALYSIS**: Brief description of what's happening in the log (2-5 sentences). Include:
   - Station/connector type if visible
   - Sequence of events
   - Problems or errors

2. **ERROR CODES**: List of found error codes (e.g.: ConnectorLockFailure, GroundFailure, EVCommunicationError)

3. **STATUS**: Current station/connector status (Available, Preparing, Charging, SuspendedEV, SuspendedEVSE, Finishing, Reserved, Unavailable, Faulted)

4. **RECOMMENDATIONS**: 2-4 specific recommendations to resolve the issue

Response format:
---ANALYSIS---
[analysis text]

---ERROR_CODES---
[code1]
[code2]

---STATUS---
[status]

---RECOMMENDATIONS---
- [recommendation 1]
- [recommendation 2]
"""

    def _parse_analysis(self, text: str, language: str) -> dict:
        """Parse structured analysis from LLM response."""
        result = {
            "analysis": "",
            "error_codes": [],
            "status": "unknown",
            "recommendations": [],
        }

        # Define section markers based on language
        if language == "uk":
            analysis_marker = "---АНАЛІЗ---"
            errors_marker = "---КОДИ_ПОМИЛОК---"
            status_marker = "---СТАТУС---"
            recs_marker = "---РЕКОМЕНДАЦІЇ---"
        else:
            analysis_marker = "---ANALYSIS---"
            errors_marker = "---ERROR_CODES---"
            status_marker = "---STATUS---"
            recs_marker = "---RECOMMENDATIONS---"

        # Split by sections
        sections = {}
        current_section = None
        current_content = []

        for line in text.split('\n'):
            line_stripped = line.strip()
            if line_stripped in [analysis_marker, errors_marker, status_marker, recs_marker]:
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = line_stripped
                current_content = []
            else:
                current_content.append(line)

        if current_section:
            sections[current_section] = '\n'.join(current_content).strip()

        # Extract data from sections
        if analysis_marker in sections:
            result["analysis"] = sections[analysis_marker]

        if errors_marker in sections:
            errors = [e.strip() for e in sections[errors_marker].split('\n') if e.strip()]
            result["error_codes"] = errors

        if status_marker in sections:
            status = sections[status_marker].strip()
            # Clean up status
            if status:
                result["status"] = status.split()[0] if ' ' in status else status

        if recs_marker in sections:
            recs = []
            for line in sections[recs_marker].split('\n'):
                line = line.strip()
                if line.startswith('- '):
                    recs.append(line[2:])
                elif line and not line.startswith('---'):
                    recs.append(line)
            result["recommendations"] = recs

        # Fallback: if no structured format, use full text as analysis
        if not result["analysis"] and text:
            result["analysis"] = text

        return result


# Singleton instance
log_analysis_service = LogAnalysisService()
