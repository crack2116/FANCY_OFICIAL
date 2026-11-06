#!/bin/sh
# POST-only reachability diagnosis through Traefik with a DUMMY payload.
# No real credentials are involved; expects 400/401/500-style JSON response.
set -u
ENV_FILE=${ENV_FILE:-/home/ivan/fancyperu-dokploy.env}
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)
echo "== 1. POST with dummy payload, stderr shown =="
curl -sS -m 20 -o /dev/null -w 'code=%{http_code}\n' \
  -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
  --data '{"email":"nobody@example.com","password":"wrongpass"}' \
  http://127.0.0.1/auth/user/emailpass
echo "== 2. GET-only sanity =="
curl -sS -m 20 -o /dev/null -w 'health=%{http_code}\n' \
  -H "Host: $API_DOMAIN" http://127.0.0.1/health
