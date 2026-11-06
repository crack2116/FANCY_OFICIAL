#!/bin/sh
# Read-only admin checks through Traefik: emailpass login (no secrets printed)
# and the admin UI reachable. Uses the protected seed env file. The login body
# is built via a temporary file so curl errors can never print credentials.
set -u
SEED_FILE=${SEED_FILE:-/home/ivan/fancyperu-seed.env}
ENV_FILE=${ENV_FILE:-/home/ivan/fancyperu-dokploy.env}
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)
B=$(mktemp)
R=$(mktemp)
trap 'rm -f "$B" "$R" "$B.err"' EXIT
chmod 600 "$B" "$R" "$B.err" 2>/dev/null || true

. "$SEED_FILE"
printf '{"email": ' > "$B"
printf '%s' "$STAGING_ADMIN_EMAIL" | jq -Rs . >> "$B"
printf ', "password": ' >> "$B"
printf '%s' "$STAGING_ADMIN_PASSWORD" | jq -Rs . >> "$B"
printf '}' >> "$B"
c=$(curl -sS -m 20 -o "$R" -w '%{http_code}' -H "Host: $API_DOMAIN" \
  -H 'Content-Type: application/json' \
  --data @"$B" \
  http://127.0.0.1/auth/user/emailpass 2>"$B.err") || true
if [ -s "$B.err" ]; then
  echo "curl stderr: $(cat "$B.err")"
fi
if [ "$c" = "200" ] && grep -q '"token"' "$R" 2>/dev/null; then
  echo "OK   admin emailpass login -> 200 with token ($STAGING_ADMIN_EMAIL)"
else
  echo "FAIL admin emailpass login -> $c"
fi

c=$(curl -sS -m 20 -o /dev/null -L -w '%{http_code}' -H "Host: $API_DOMAIN" http://127.0.0.1/app 2>/dev/null)
case "$c" in
  200) echo "OK   /app (admin UI) reachable -> 200 after redirects" ;;
  *) echo "FAIL /app -> $c" ;;
esac
