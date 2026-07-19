#!/bin/sh
set -eu

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
FILENAME="todo-backup-${TIMESTAMP}.sql"
FILEPATH="/tmp/${FILENAME}"

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "${FILEPATH}"

gsutil cp "${FILEPATH}" "gs://${BUCKET_NAME}/${FILENAME}"

echo "Backup uploaded: gs://${BUCKET_NAME}/${FILENAME}"
