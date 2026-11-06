#!/bin/sh
# ==============================================================================
# FANCYPERU — read-only verification of the test deployment.
# Requires Docker access (run with sudo). It does not create, change or delete
# anything except a container-local `mc` alias used to read bucket policies.
#
# Usage:
#   sudo sh ./verify-test-deploy.sh
#   sudo PROJECT=<dokploy-app-name> sh ./verify-test-deploy.sh
#
# The Docker Compose project name is auto-detected from container labels when
# PROJECT is not set (Dokploy may append a random suffix, e.g.
# fancyperu-test-k6cmve); a project passed via PROJECT is still honored.
#
# One-shot services (fancyperu-migration, fancyperu-minio-init) are handled
# separately: a missing container is accepted only when its durable effects are
# verified (migrations recorded + backend healthy; MinIO buckets and policies
# on the live server). When the container still exists, its exit code must be 0.
# ==============================================================================
set -u

PROJECT=${PROJECT:-}
NETWORK=${NETWORK:-fancyperu-internal}
FAIL=0
MIGRATIONS_APPLIED=""
MEDIA_BUCKET_OK=0
PRIVATE_BUCKET_OK=0
MEDIA_POLICY_OK=0
PRIVATE_POLICY_OK=0

detect_project() {
  docker ps -aq --filter "label=com.docker.compose.service" 2>/dev/null |
  while read -r id; do
    proj=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null)
    case "$proj" in
      fancyperu-test*) printf '%s\n' "$proj" ;;
    esac
  done | sort -u | head -n 1
}

say() { printf '\n=== %s ===\n' "$1"; }
ok() { printf 'OK   %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }

if [ -z "$PROJECT" ]; then
  PROJECT=$(detect_project)
  [ -n "$PROJECT" ] || { echo "ERROR: no project passed and none detected (no containers with a fancyperu-test* compose project label)" >&2; exit 1; }
  ok "auto-detected Docker Compose project: $PROJECT"
fi

# Read the expected Traefik exposure from the private env file. The file is
# referenced by name only; no value is ever printed.
DOKPLOY_ENV=${DOKPLOY_ENV:-/home/ivan/fancyperu-dokploy.env}
TRAEFIK_ENABLE_EXPECTED=false
TRAEFIK_ENTRYPOINT_EXPECTED=websecure
TRAEFIK_TLS_EXPECTED=true
if [ -f "$DOKPLOY_ENV" ]; then
  TRAEFIK_ENABLE_EXPECTED=$(grep -oE '^TRAEFIK_ENABLE=.*' "$DOKPLOY_ENV" | head -n 1 | cut -d= -f2)
  TRAEFIK_ENTRYPOINT_EXPECTED=$(grep -oE '^TRAEFIK_ENTRYPOINT=.*' "$DOKPLOY_ENV" | head -n 1 | cut -d= -f2)
  TRAEFIK_TLS_EXPECTED=$(grep -oE '^TRAEFIK_TLS=.*' "$DOKPLOY_ENV" | head -n 1 | cut -d= -f2)
fi

say() { printf '\n=== %s ===\n' "$1"; }
ok() { printf 'OK   %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }

cid() {
  docker ps -aq \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.service=$1" | head -n 1
}

say "containers"
docker ps -a \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

DB=$(cid fancyperu-db)
[ -n "$DB" ] || bad "container for service fancyperu-db not found (project=$PROJECT)"
REDIS=$(cid fancyperu-redis)
[ -n "$REDIS" ] || bad "container for service fancyperu-redis not found (project=$PROJECT)"
MINIO=$(cid fancyperu-minio)
[ -n "$MINIO" ] || bad "container for service fancyperu-minio not found (project=$PROJECT)"
BACKEND=$(cid fancyperu-backend)
[ -n "$BACKEND" ] || bad "container for service fancyperu-backend not found (project=$PROJECT)"
STOREFRONT=$(cid fancyperu-storefront)
[ -n "$STOREFRONT" ] || bad "container for service fancyperu-storefront not found (project=$PROJECT)"
MIGRATION=$(cid fancyperu-migration)
MINIO_INIT=$(cid fancyperu-minio-init)

say "state, health and restarts"
for pair in \
  "db:$DB" "redis:$REDIS" "minio:$MINIO" \
  "backend:$BACKEND" "storefront:$STOREFRONT"; do
  name=${pair%%:*}
  id=${pair#*:}
  [ -n "$id" ] || continue
  line=$(docker inspect \
    -f '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} restarts={{.RestartCount}}' \
    "$id")
  printf '%-12s %s\n' "$name" "$line"
  case "$line" in
    running*) ;;
    *) bad "$name is not running" ;;
  esac
done
# `fancyperu-migration` and `fancyperu-minio-init` are one-shot services: they
# exit after completing and their container object may no longer exist, for
# example after a targeted redeploy (`up -d --no-deps --no-build <services>`)
# that never referenced them. Absence alone is NOT success: when the container
# is gone, the persistent effects are validated in the dedicated section below.
# When the container exists (fresh install), its exit code is checked strictly.
say "initialisation jobs (one-shot)"
for pair in "migration:$MIGRATION" "minio-init:$MINIO_INIT"; do
  name=${pair%%:*}
  id=${pair#*:}
  if [ -z "$id" ]; then
    printf '%-12s container absent (completed one-shot; effects validated below)\n' "$name"
    continue
  fi
  status=$(docker inspect -f '{{.State.Status}}' "$id")
  code=$(docker inspect -f '{{.State.ExitCode}}' "$id")
  printf '%-12s status=%s exit_code=%s\n' "$name" "$status" "$code"
  case "$status" in
    exited) ;;
    *) bad "$name is in state '$status' (expected exited after completion)" ;;
  esac
  [ "$code" = "0" ] || bad "$name exited with $code"
done

say "software versions"
[ -n "$DB" ] && docker exec "$DB" postgres --version
[ -n "$REDIS" ] && docker exec "$REDIS" redis-server --version
[ -n "$MINIO" ] && docker exec "$MINIO" minio --version | head -n 1
[ -n "$BACKEND" ] && printf 'medusa ' && \
  docker exec "$BACKEND" node -p "require('/app/apps/backend/node_modules/@medusajs/medusa/package.json').version"
[ -n "$STOREFRONT" ] && printf 'next ' && \
  docker exec -w /app/apps/storefront "$STOREFRONT" node -p "require('next/package.json').version"

say "network"
docker network inspect "$NETWORK" \
  --format 'name={{.Name}} driver={{.Driver}} containers={{range .Containers}}{{.Name}} {{end}}' 2>&1

say "published ports (must be empty for db/redis/minio)"
for pair in "db:$DB" "redis:$REDIS" "minio:$MINIO"; do
  name=${pair%%:*}
  id=${pair#*:}
  [ -n "$id" ] || continue
  ports=$(docker port "$id" 2>&1)
  if [ -z "$ports" ]; then ok "$name publishes no host port"; else bad "$name publishes: $ports"; fi
done

say "traefik exposure (expected from the private env file)"
for triple in "backend:fancyperu-api:$BACKEND" \
              "storefront:fancyperu-storefront:$STOREFRONT" \
              "s3:fancyperu-s3:$MINIO"; do
  name=$(echo "$triple" | cut -d: -f1)
  rid=$(echo "$triple" | cut -d: -f2)
  id=$(echo "$triple" | cut -d: -f3)
  [ -n "$id" ] || continue
  value=$(docker inspect -f "{{index .Config.Labels \"traefik.enable\"}}" "$id" 2>/dev/null)
  entry=$(docker inspect -f "{{index .Config.Labels \"traefik.http.routers.$rid.entrypoints\"}}" "$id" 2>/dev/null)
  tlsv=$(docker inspect -f "{{index .Config.Labels \"traefik.http.routers.$rid.tls\"}}" "$id" 2>/dev/null)
  printf '%-12s router=%s enable=%s entrypoint=%s tls=%s\n' \
    "$name" "$rid" "${value:-<unset>}" "${entry:-<unset>}" "${tlsv:-<unset>}"
  case "$value" in
    "$TRAEFIK_ENABLE_EXPECTED") ok "$name traefik.enable=$value (expected)" ;;
    *) bad "$name traefik.enable=${value:-<unset>} (expected $TRAEFIK_ENABLE_EXPECTED)" ;;
  esac
  if [ "$TRAEFIK_ENABLE_EXPECTED" = "true" ]; then
    case "$entry" in
      "$TRAEFIK_ENTRYPOINT_EXPECTED") ;;
      *) bad "$name router $rid entrypoint=${entry:-<unset>} (expected $TRAEFIK_ENTRYPOINT_EXPECTED)" ;;
    esac
    if [ "$TRAEFIK_TLS_EXPECTED" = "false" ]; then
      case "$tlsv" in
        false|False|FALSE|"") ok "$name router $rid tls disabled" ;;
        *) bad "$name router $rid tls=${tlsv:-<unset>} (expected false)" ;;
      esac
    fi
  fi
done

say "postgresql"
if [ -n "$DB" ]; then
  PGUSER=$(docker exec "$DB" printenv POSTGRES_USER)
  PGDB=$(docker exec "$DB" printenv POSTGRES_DB)
  docker exec "$DB" pg_isready -U "$PGUSER" -d "$PGDB"
  tables=$(docker exec "$DB" psql -U "$PGUSER" -d "$PGDB" -tAc \
    "select count(*) from information_schema.tables where table_schema='public'" 2>&1)
  printf 'public_tables=%s\n' "$tables"
  migrations=$(docker exec "$DB" psql -U "$PGUSER" -d "$PGDB" -tAc \
    "select count(*) from mikro_orm_migrations" 2>&1)
  printf 'migrations=%s\n' "$migrations"
  case "$migrations" in
    ''|*[!0-9]*) bad "migration table not readable: $migrations" ;;
    *)
      [ "$migrations" -gt 0 ] || bad "no migrations recorded"
      MIGRATIONS_APPLIED=$migrations
      ;;
  esac
fi

say "redis"
if [ -n "$REDIS" ]; then
  pong=$(docker exec "$REDIS" sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping' 2>&1)
  printf 'ping=%s\n' "$pong"
  [ "$pong" = "PONG" ] || bad "redis did not answer PONG"
  docker exec "$REDIS" sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli CONFIG GET appendonly maxmemory-policy' 2>&1
fi

say "minio buckets and policies"
if [ -n "$MINIO" ]; then
  MEDIA_BUCKET=$(docker exec "$BACKEND" printenv S3_BUCKET 2>/dev/null)
  [ -n "$MEDIA_BUCKET" ] || MEDIA_BUCKET=fancyperu-media
  PRIVATE_BUCKET=$(docker exec "$BACKEND" printenv S3_PRIVATE_BUCKET 2>/dev/null)
  [ -n "$PRIVATE_BUCKET" ] || PRIVATE_BUCKET=fancyperu-private
  bucket_list=$(docker exec "$MINIO" sh -c '
    mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1
    mc ls local
  ' 2>&1)
  printf 'buckets:\n%s\n' "$bucket_list"
  case "$bucket_list" in
    *"$MEDIA_BUCKET"*) MEDIA_BUCKET_OK=1 ;;
    *) bad "media bucket $MEDIA_BUCKET missing" ;;
  esac
  case "$bucket_list" in
    *"$PRIVATE_BUCKET"*) PRIVATE_BUCKET_OK=1 ;;
    *) bad "private bucket $PRIVATE_BUCKET missing" ;;
  esac
  media_policy=$(docker exec "$MINIO" sh -c '
    mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1
    mc anonymous get "local/$1"
  ' sh "$MEDIA_BUCKET" 2>&1)
  printf 'media policy (%s): %s\n' "$MEDIA_BUCKET" "$media_policy"
  case "$media_policy" in
    *download*) ok "media bucket is anonymous read-only"; MEDIA_POLICY_OK=1 ;;
    *) bad "media bucket policy is not anonymous read-only" ;;
  esac
  private_policy=$(docker exec "$MINIO" sh -c '
    mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1
    mc anonymous get "local/$1"
  ' sh "$PRIVATE_BUCKET" 2>&1)
  printf 'private policy (%s): %s (must be none/empty)\n' "$PRIVATE_BUCKET" "$private_policy"
  case "$private_policy" in
    *private*|none|None|NONE|"") ok "private bucket has no anonymous policy"; PRIVATE_POLICY_OK=1 ;;
    *) bad "private bucket has an anonymous policy: $private_policy" ;;
  esac
fi

say "persistent effects of the one-shot jobs"
# Never treat the absence of a one-shot container as success: require proof
# of the durable state it was responsible for.
if [ -z "$MIGRATION" ]; then
  if [ -z "$BACKEND" ]; then
    bad "migration container absent and backend container not found"
  else
    backend_health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "$BACKEND" 2>/dev/null)
    case "$backend_health" in
      healthy) ;;
      *) bad "migration container absent and backend health is ${backend_health:-unknown}" ;;
    esac
    case "${MIGRATIONS_APPLIED:-}" in
      ''|*[!0-9]*) bad "migration container absent and the migrations table could not be read" ;;
      0) bad "migration container absent and no migrations are recorded" ;;
      *) ok "migration effects verified: $MIGRATIONS_APPLIED migrations recorded, backend healthy" ;;
    esac
  fi
fi
if [ -z "$MINIO_INIT" ]; then
  if [ "$MEDIA_BUCKET_OK" = "1" ] && [ "$PRIVATE_BUCKET_OK" = "1" ] \
     && [ "$MEDIA_POLICY_OK" = "1" ] && [ "$PRIVATE_POLICY_OK" = "1" ]; then
    ok "minio-init effects verified: both buckets present, media public-read, private anonymous policy none"
  else
    bad "minio-init container absent and bucket/policy effects could not be confirmed"
  fi
fi

say "http endpoints (inside the containers)"
if [ -n "$BACKEND" ]; then
  docker exec "$BACKEND" wget -qO- http://127.0.0.1:9000/health 2>&1 | head -c 200; echo
  docker exec "$BACKEND" sh -c 'wget -S --spider http://127.0.0.1:9000/app 2>&1 | head -n 1'
fi
if [ -n "$STOREFRONT" ]; then
  docker exec "$STOREFRONT" sh -c 'wget -S --spider http://127.0.0.1:8000/ 2>&1 | head -n 1'
fi

say "admin authentication (credentials are never printed)"
SEED_FILE=${SEED_FILE:-/home/ivan/fancyperu-seed.env}
if [ "${SKIP_ADMIN_LOGIN:-0}" = "1" ]; then
  echo "skip: SKIP_ADMIN_LOGIN=1 (admin login is meaningful only AFTER the seed)"
elif [ -n "$BACKEND" ] && [ -f "$SEED_FILE" ]; then
  . "$SEED_FILE"
  if [ -n "${STAGING_ADMIN_EMAIL:-}" ] && [ -n "${STAGING_ADMIN_PASSWORD:-}" ]; then
    response=$(docker exec "$BACKEND" wget -qO- \
      --header='Content-Type: application/json' \
      --post-data="{\"email\":\"$STAGING_ADMIN_EMAIL\",\"password\":\"$STAGING_ADMIN_PASSWORD\"}" \
      http://127.0.0.1:9000/auth/user/emailpass 2>&1)
    case "$response" in
      *'"token"'*) ok "admin emailpass login" ;;
      *)
        bad "admin emailpass login failed"
        printf 'response: %s\n' "$(printf '%s' "$response" | head -c 200)"
        ;;
    esac
  else
    bad "seed credentials missing from $SEED_FILE"
  fi
else
  if [ -z "$BACKEND" ]; then
    echo "skip: backend container not found (project=$PROJECT); admin login check not attempted"
  else
    echo "skip: $SEED_FILE not present"
  fi
fi

say "culqi state (values are never printed)"
if [ -n "$BACKEND" ]; then
  docker exec "$BACKEND" sh -c '
    if [ -z "${CULQI_SECRET_KEY:-}" ]; then echo "CULQI_SECRET_KEY=empty"; else echo "CULQI_SECRET_KEY=SET"; fi
    echo "CULQI_ENABLED=${CULQI_ENABLED:-unset}"
    if [ -z "${CULQI_PUBLIC_KEY:-}" ]; then echo "CULQI_PUBLIC_KEY=empty"; else echo "CULQI_PUBLIC_KEY=SET"; fi
  '
fi
if [ -n "$STOREFRONT" ]; then
  hits=$(docker exec "$STOREFRONT" sh -c \
    'grep -R -l "CULQI_SECRET_KEY" /app/apps/storefront/.next 2>/dev/null | head -n 3')
  if [ -z "$hits" ]; then ok "CULQI_SECRET_KEY absent from the storefront bundle"; else bad "CULQI_SECRET_KEY found in: $hits"; fi
fi

say "resource usage"
if [ -n "$DB" ] && [ -n "$REDIS" ] && [ -n "$MINIO" ] && [ -n "$BACKEND" ] && [ -n "$STOREFRONT" ]; then
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' \
    "$DB" "$REDIS" "$MINIO" "$BACKEND" "$STOREFRONT"
fi
free -h
df -h /

say "result"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL CHECKS PASSED"
else
  echo "SOME CHECKS FAILED"
fi
exit "$FAIL"
