#!/bin/sh
# Read-only: print the Dokploy container/image, the Compose plugin version
# inside the Dokploy container, the Dokploy package version and image labels.
# Run with sudo: sudo sh deploy/dokploy/check-dokploy.sh
set -u

echo "--- containers matching dokploy ---"
docker ps --format '{{.Names}}\t{{.Image}}\t{{.CreatedAt}}' | grep -i dokploy || true

c=$(docker ps --format '{{.ID}} {{.Names}} {{.Image}}' | awk '$2 == "dokploy" || $3 ~ /dokploy/ {print $1; exit}')
if [ -z "${c:-}" ]; then
  c=$(docker ps -q --filter name=dokploy | head -n 1)
fi
if [ -z "${c:-}" ]; then
  echo "dokploy container not found"
  exit 1
fi
echo "container=$c"

echo "--- compose plugin ---"
docker exec "$c" docker compose version 2>&1 || true

echo "--- dokploy package version ---"
docker exec "$c" sh -c '
  for f in /app/package.json /app/apps/dokploy/package.json /app/dokploy/package.json; do
    if [ -f "$f" ]; then
      echo "$f"
      grep -m1 "\"version\"" "$f"
      break
    fi
  done
' 2>&1 || true

echo "--- image ---"
img=$(docker inspect -f '{{.Config.Image}}' "$c" 2>/dev/null || true)
echo "image=$img"
if [ -n "$img" ]; then
  docker image inspect "$img" --format '{{json .Config.Labels}}' 2>/dev/null || true
fi
