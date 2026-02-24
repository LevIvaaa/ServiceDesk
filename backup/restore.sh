#!/bin/bash
# Database restore script
# Usage: ./restore.sh [backup_file]
# If no file specified, shows available backups

BACKUP_DIR="/backups"
DB_NAME="${POSTGRES_DB:-ecofactor_servicedesk}"
DB_USER="${POSTGRES_USER:-ecofactor}"

if [ -z "$1" ]; then
    echo "Available backups:"
    echo "===================="
    ls -lht ${BACKUP_DIR}/db_backup_*.sql.gz 2>/dev/null | awk '{print NR". "$NF" ("$5", "$6" "$7" "$8")"}'
    echo ""
    echo "Usage: docker-compose exec db_backup /backups/restore.sh /backups/db_backup_YYYYMMDD_HHMMSS.sql.gz"
    exit 0
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: File not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will DROP and RECREATE the database ${DB_NAME}!"
echo "Restoring from: ${BACKUP_FILE}"
echo ""

# Drop and recreate database
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${DB_USER}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# Restore
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${DB_USER}" -d "${DB_NAME}"

if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completed successfully!"
else
    echo "[$(date)] ERROR: Restore failed!"
    exit 1
fi
