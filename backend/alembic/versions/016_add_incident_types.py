"""Add incident_types table

Revision ID: 016
Revises: 015
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None

# Default incident types to seed
DEFAULT_INCIDENT_TYPES = [
    "Софтовий баг",
    "Фізична поломка",
    "Не може зарядитись",
    "Перерахунок",
    "Поганий зв'язок",
    "ДВС",
    "Зламалось авто",
    "Інше",
]


def upgrade() -> None:
    op.create_table(
        "incident_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Seed default incident types
    incident_types_table = sa.table(
        "incident_types",
        sa.column("name", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        incident_types_table,
        [{"name": name, "is_active": True} for name in DEFAULT_INCIDENT_TYPES],
    )


def downgrade() -> None:
    op.drop_table("incident_types")
