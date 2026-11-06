#!/bin/sh
# ==============================================================================
# FANCYPERU - extract the REAL staging publishable token from the test database
# into a protected file. Run with sudo (Docker socket). Print-safe: the token
# itself is never echoed; only its length and destination path are reported.
#
# The token (pk_...) is the STOREFRONT-CONSUMABLE token from the api_key table
# for the row titled 'FancyPets Staging Publishable Key'. The script refuses to
# write anything that does not start with pk_ and refuses ambiguity (id_ or
# apk_ identifiers must never be confused with the token).
#
# Result: /home/ivan/fancyperu-publishable-key (mode 600, owner ivan).
# ==============================================================================
set -eu

DP=/home/ivan/fancyperu-publishable-key
KEY_TITLE='FancyPets Staging Publishable Key'

DBID=$(docker ps -aq --filter "label=com.docker.compose.service=fancyperu-db" |
  while read -r id; do
    p=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null)
    case "$p" in
      fancyperu-test*) printf '%s\n' "$id" ;;
    esac
  done | head -n1)
[ -n "$DBID" ] || { echo "extract-key: no db container for a fancyperu-test* project" >&2; exit 1; }
PROJ=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$DBID")
echo "extract-key: using db container of project $PROJ"

CNT=$(docker exec "$DBID" psql -U "$(docker exec "$DBID" printenv POSTGRES_USER)" \
  -d "$(docker exec "$DBID" printenv POSTGRES_DB)" \
  -tAc "select count(*) from api_key where title='$KEY_TITLE'" | tr -d '[:space:]')
case "$CNT" in
  1) ;;
  *) echo "extract-key: expected exactly 1 api_key row, found '$CNT' — refusing" >&2; exit 1 ;;
esac

TOKEN=$(docker exec "$DBID" psql -U "$(docker exec "$DBID" printenv POSTGRES_USER)" \
  -d "$(docker exec "$DBID" printenv POSTGRES_DB)" \
  -tAc "select token from api_key where title='$KEY_TITLE'" | tr -d '[:space:]')

case "$TOKEN" in
  pk_*) ;;
  *) echo "extract-key: value does not start with pk_ (an identifier like apk_ was probably matched) — refusing" >&2; exit 1 ;;
esac

printf %s "$TOKEN" > "$DP"
chmod 600 "$DP"
chown ivan:ivan "$DP" 2>/dev/null || true
echo "extract-key: OK — token written to $DP (mode 600, length ${#TOKEN})"
