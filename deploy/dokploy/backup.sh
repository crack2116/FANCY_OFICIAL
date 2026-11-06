#!/bin/sh
# ==============================================================================
# FANCYPERU — backup of the dedicated PostgreSQL database and MinIO objects.
# Non-destructive: it never deletes buckets, objects or backups unless
# RETENTION_COUNT is explicitly set to a positive number.
#
# Usage:
#   sudo sh ./backup.sh <backup-root> <env-file>
#
# Example:
#   sudo sh ./backup.sh /var/backups/fancyperu /etc/dokploy/compose/fancyperu/.env
#
# Secrets are read from the env file and passed through the environment only.
# They are never printed, and mc output is not echoed.
# ==============================================================================
set -eu
umask 077

BACKUP_ROOT=${1:?usage: backup.sh <backup-root> <env-file>}
ENV_FILE=${2:?usage: backup.sh <backup-root> <env-file>}
PROJECT=${PROJECT:-fancyperu}
NETWORK=${NETWORK:-fancyperu-internal}
MINIO_IMAGE=${MINIO_IMAGE:-ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z}
RETENTION_COUNT=${RETENTION_COUNT:-0}

fail() { echo "backup: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "docker is not available"
[ -r "$ENV_FILE" ] || fail "cannot read env file: $ENV_FILE"

read_var() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//; s/"$//'
}

POSTGRES_USER=$(read_var POSTGRES_USER)
POSTGRES_DB=$(read_var POSTGRES_DB)
POSTGRES_PASSWORD=$(read_var POSTGRES_PASSWORD)
MINIO_ROOT_USER=$(read_var MINIO_ROOT_USER)
MINIO_ROOT_PASSWORD=$(read_var MINIO_ROOT_PASSWORD)
MEDIA_BUCKET=$(read_var S3_BUCKET)
PRIVATE_BUCKET=$(read_var S3_PRIVATE_BUCKET)
MEDIA_BUCKET=${MEDIA_BUCKET:-fancyperu-media}
PRIVATE_BUCKET=${PRIVATE_BUCKET:-fancyperu-private}

[ -n "$POSTGRES_USER" ] || fail "POSTGRES_USER is empty in $ENV_FILE"
[ -n "$POSTGRES_DB" ] || fail "POSTGRES_DB is empty in $ENV_FILE"
[ -n "$MINIO_ROOT_USER" ] || fail "MINIO_ROOT_USER is empty in $ENV_FILE"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST/db" "$DEST/minio/media" "$DEST/minio/private"

DB_CONTAINER=$(docker ps -q \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --filter "label=com.docker.compose.service=fancyperu-db")
[ -n "$DB_CONTAINER" ] || fail "fancyperu-db container not found for project $PROJECT"

echo "backup: dumping PostgreSQL ($POSTGRES_DB)"
docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DEST/db/db.dump"

mirror_bucket() {
  bucket=$1
  target=$2
  mkdir -p "$target"
  echo "backup: mirroring bucket $bucket"
  docker run --rm \
    --network "$NETWORK" \
    -e "MINIO_ROOT_USER=$MINIO_ROOT_USER" \
    -e "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD" \
    -e "BUCKET=$bucket" \
    -v "$target:/backup" \
    --entrypoint /bin/sh \
    "$MINIO_IMAGE" \
    -c 'mc alias set source http://fancyperu-minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc mirror --overwrite "source/$BUCKET" /backup' >/dev/null
}

mirror_bucket "$MEDIA_BUCKET" "$DEST/minio/media"
mirror_bucket "$PRIVATE_BUCKET" "$DEST/minio/private"

echo "backup: checksums"
(
  cd "$DEST"
  find . -type f ! -name SHA256SUMS -exec sha256sum {} + > SHA256SUMS
)

echo "backup: done -> $DEST"

if [ "$RETENTION_COUNT" -gt 0 ] 2>/dev/null; then
  echo "backup: pruning to the last $RETENTION_COUNT snapshots"
  ls -1dt "$BACKUP_ROOT"/* | grep -E '/[0-9]{8}T[0-9]{6}Z$' | tail -n +$((RETENTION_COUNT + 1)) | while read -r old; do
    case "$old" in
      "$BACKUP_ROOT"/*) rm -rf -- "$old" ;;
    esac
  done
fi
