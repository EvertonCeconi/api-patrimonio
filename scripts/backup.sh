#!/bin/sh
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
FILENAME="patrimonio_${TIMESTAMP}.sql.gz"

export PGPASSWORD="${POSTGRES_PASSWORD}"

pg_dump -h "${PGHOST}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Remove backups older than 30 days
find "${BACKUP_DIR}" -name "patrimonio_*.sql.gz" -mtime +30 -delete

echo "Backup saved: ${FILENAME}"
