#!/bin/sh
# Read-only: ask Dokploy for the exact compose command it would run for
# fancyperu-test (getDefaultCommand). No secrets involved.
set -eu
TOKEN_FILE=/home/ivan/fancyperu-dokploy-token
COMPOSE_ID=$(cat /home/ivan/fancyperu-dokploy-compose-id)
H=$(mktemp)
B=$(mktemp)
trap 'rm -f "$H" "$B"' EXIT
chmod 600 "$H" "$B"
printf 'x-api-key: ' > "$H"
cat "$TOKEN_FILE" >> "$H"
printf '\n' >> "$H"
curl -sS -m 30 --header @"$H" \
  "http://127.0.0.1:3000/api/compose.getDefaultCommand?composeId=$COMPOSE_ID"
echo
