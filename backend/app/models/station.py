from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.operator import Operator
    from app.models.ticket import Ticket


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)  # Operator's station number
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    operator_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("operators.id"), nullable=False
    )

    # Address
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Technical parameters
    status: Mapped[str] = mapped_column(String(20), default="unknown")
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    firmware_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    installation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_maintenance_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    operator: Mapped["Operator"] = relationship("Operator", back_populates="stations")
    ports: Mapped[list["StationPort"]] = relationship(
        "StationPort", back_populates="station", cascade="all, delete-orphan"
    )
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="station")


class StationPort(Base):
    __tablename__ = "station_ports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=False
    )
    port_number: Mapped[int] = mapped_column(Integer, nullable=False)
    connector_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    power_kw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="unknown")
    last_session_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    # Relationships
    station: Mapped["Station"] = relationship("Station", back_populates="ports")
