import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import aiofiles
import aiohttp

from app.config import settings
from app.core.exceptions import LogCollectionError
from app.models.station import Station

logger = logging.getLogger(__name__)


class LogCollectorService:
    """Service for collecting logs from charging stations."""

    async def collect_logs(
        self,
        station: Station,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> dict:
        """
        Automatically collect logs from a station.
        Returns file path and metadata.
        """
        if not station.ip_address and not station.ocpp_endpoint:
            raise LogCollectionError("Station has no connection parameters")

        # Determine time range
        if not end_time:
            end_time = datetime.utcnow()
        if not start_time:
            start_time = end_time - timedelta(hours=24)

        log_data = None

        # 1. Try OCPP if endpoint exists
        if station.ocpp_endpoint:
            try:
                log_data = await self._collect_via_ocpp(station, start_time, end_time)
            except Exception as e:
                logger.warning(f"OCPP collection failed for station {station.station_number}: {e}")

        # 2. Try HTTP API if IP exists
        if not log_data and station.ip_address:
            try:
                log_data = await self._collect_via_http(station, start_time, end_time)
            except Exception as e:
                logger.warning(f"HTTP collection failed for station {station.station_number}: {e}")

        if not log_data:
            raise LogCollectionError("Failed to collect logs from station")

        # Save file
        filename = f"logs_{station.station_number}_{end_time.strftime('%Y%m%d_%H%M%S')}.log"
        file_path = await self._save_log_file(filename, log_data)

        return {
            "filename": filename,
            "file_path": file_path,
            "file_size": len(log_data),
            "log_start_time": start_time,
            "log_end_time": end_time,
            "collection_method": "auto",
        }

    async def _collect_via_ocpp(
        self,
        station: Station,
        start_time: datetime,
        end_time: datetime,
    ) -> bytes:
        """Collect logs via OCPP GetDiagnostics."""
        # TODO: Implement full OCPP client
        # This would involve:
        # 1. Connecting to the OCPP endpoint
        # 2. Sending GetDiagnostics request
        # 3. Waiting for DiagnosticsStatusNotification
        # 4. Downloading the diagnostics file from the provided URL
        raise NotImplementedError("OCPP log collection not yet implemented")

    async def _collect_via_http(
        self,
        station: Station,
        start_time: datetime,
        end_time: datetime,
    ) -> bytes:
        """Collect logs via station HTTP API."""
        async with aiohttp.ClientSession() as session:
            headers = {}
            if station.api_key:
                headers["Authorization"] = f"Bearer {station.api_key}"

            url = f"http://{station.ip_address}/api/logs"
            params = {
                "from": start_time.isoformat(),
                "to": end_time.isoformat(),
            }

            try:
                async with session.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    if resp.status != 200:
                        raise LogCollectionError(f"HTTP error: {resp.status}")
                    return await resp.read()
            except aiohttp.ClientError as e:
                raise LogCollectionError(f"Connection error: {str(e)}")

    async def _save_log_file(self, filename: str, data: bytes) -> str:
        """Save log file to storage."""
        logs_dir = Path(settings.LOGS_STORAGE_PATH)
        logs_dir.mkdir(parents=True, exist_ok=True)

        file_path = logs_dir / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(data)

        return str(file_path)
