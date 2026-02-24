#!/bin/bash
# Database backup script - runs pg_dump every hour
# Keeps backups for 48 hours (48 files), then rotates

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-ecofactor_servicedesk}"
DB_USER="${POSTGRES_USER:-ecofactor}"
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
MAX_BACKUPS=48

echo "[$(date)] Starting backup of ${DB_NAME}..."

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump and compress
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h postgres -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Backup completed: ${BACKUP_FILE} (${SIZE})"
else
    echo "[$(date)] ERROR: Backup failed!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Rotate old backups - keep only last MAX_BACKUPS
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/db_backup_*.sql.gz 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt "${MAX_BACKUPS}" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t ${BACKUP_DIR}/db_backup_*.sql.gz | tail -n ${REMOVE_COUNT} | xargs rm -f
    echo "[$(date)] Rotated ${REMOVE_COUNT} old backup(s). Keeping last ${MAX_BACKUPS}."
fi

echo "[$(date)] Done. Total backups: $(ls -1 ${BACKUP_DIR}/db_backup_*.sql.gz 2>/dev/null | wc -l)"
