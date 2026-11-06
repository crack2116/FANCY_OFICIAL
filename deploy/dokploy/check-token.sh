#!/bin/sh
# Read-only token sanity check for the Dokploy API. Never prints the token.
# Output: HTTP code, project list (names/env/service names only).
set -eu
TOKEN_FILE=/home/ivan/fancyperu-dokploy-token
H=$(mktemp)
chmod 600 "$H"
trap 'rm -f "$H"' EXIT
printf 'x-api-key: ' > "$H"
cat "$TOKEN_FILE" >> "$H"
printf '\n' >> "$H"

RESP_FILE=$(mktemp)
trap 'rm -f "$H" "$RESP_FILE"' EXIT
CODE=$(curl -sS -m 30 --header "@$H" http://127.0.0.1:3000/api/project.all -o "$RESP_FILE" -w '%{http_code}')
echo "HTTP=$CODE"
if [ "$CODE" = "200" ]; then
  jq -r '[.[] | {project: .name, environments: [(.environments // []) | .[] | {envId: .environmentId, name: .name, services: [(.services // []) | .[] | {name, type: (.composeType // .applicationType // "")}]}]}]' "$RESP_FILE"
else
  head -c 300 "$RESP_FILE"
fi
