#!/bin/sh
# Zero-sudo storefront rebuild & deploy for Dokploy on 192.168.1.38
set -eu

export PATH="/home/ivan/.local/node22/bin:$PATH"

if [ -f /home/ivan/fancyperu-dokploy.env ]; then
  set -a
  . /home/ivan/fancyperu-dokploy.env
  set +a
fi

if [ -f /home/ivan/fancyperu-publishable-key ]; then
  export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$(tr -d '\r\n' < /home/ivan/fancyperu-publishable-key)"
fi
export MEDUSA_BACKEND_URL="${MEDUSA_BACKEND_URL:-http://medusa:9000}"

echo "== 1. Building @dtc/storefront standalone (zero-sudo) =="
cd /home/ivan/fancyperu-src
pnpm --filter @dtc/storefront run build

echo "== 2. Staging standalone output into /home/ivan/fancyperu-storefront-deploy =="
mkdir -p /home/ivan/fancyperu-old-deploy-1
if [ -d /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/cache ] && [ ! -L /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/cache ]; then
  mv /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/cache "/home/ivan/fancyperu-old-deploy-1/cache-$(date +%s)" || true
fi
rm -rf /home/ivan/fancyperu-storefront-deploy
mkdir -p /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next
cp -a /home/ivan/fancyperu-src/apps/storefront/.next/standalone/. /home/ivan/fancyperu-storefront-deploy/
cp -a /home/ivan/fancyperu-src/apps/storefront/.next/static /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/static
cp -a /home/ivan/fancyperu-src/apps/storefront/public /home/ivan/fancyperu-storefront-deploy/apps/storefront/public
rm -rf /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/cache
ln -snf /tmp /home/ivan/fancyperu-storefront-deploy/apps/storefront/.next/cache
chmod -R a+rX /home/ivan/fancyperu-storefront-deploy

echo "== 3. Triggering Dokploy compose.deploy =="
TOKEN="$(tr -d '\r\n' < /home/ivan/fancyperu-dokploy-token)"
COMPOSE_ID="$(tr -d '\r\n' < /home/ivan/fancyperu-dokploy-compose-id)"
curl -fsS -X POST "http://127.0.0.1:3000/api/compose.deploy" \
  -H "x-api-key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"composeId\":\"$COMPOSE_ID\"}" >/dev/null

echo "== Deploy triggered successfully =="
