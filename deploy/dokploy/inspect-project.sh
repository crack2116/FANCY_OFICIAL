#!/bin/sh
# Read-only: list ALL projects named FANCYPERU with identity metadata.
set -eu
TOKEN_FILE=/home/ivan/fancyperu-dokploy-token
H=$(mktemp)
RESP_FILE=$(mktemp)
trap 'rm -f "$H" "$RESP_FILE"' EXIT
printf 'x-api-key: ' > "$H"
cat "$TOKEN_FILE" >> "$H"
printf '\n' >> "$H"
curl -sS -m 30 --header "@$H" http://127.0.0.1:3000/api/project.all -o "$RESP_FILE"
jq '[.[] | select(.name == "FANCYPERU") | {
  projectId,
  createdAt,
  description,
  envs: [(.environments // []) | .[] | {environmentId, name, isDefault,
    apps: [(.applications // []) | .[] | .name],
    compose: [(.compose // []) | .[] | .name]
  }]
}]' "$RESP_FILE"
