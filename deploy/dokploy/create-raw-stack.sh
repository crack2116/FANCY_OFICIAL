#!/bin/sh
# ==============================================================================
# FANCYPERU - create (and optionally deploy) the Raw Compose service in Dokploy
# through the REST API. Runs as ivan on the Dokploy host: no sudo, nothing
# secret is ever printed. The API token is read from TOKEN_FILE (chmod 600)
# that the human created; it never appears in logs or in this output.
#
# Safety rules implemented here (user-authorized scope):
#   - touches ONLY the new FANCYPERU project/service
#   - never deletes anything (no freshVolumes, no destructive flags)
#   - stops on the first API error with a clear message
#
# Usage:
#   sh deploy/dokploy/create-raw-stack.sh             # create/update config
#   sh deploy/dokploy/create-raw-stack.sh --deploy    # also deploy and wait
# ==============================================================================
set -u

BASE=${BASE_URL:-http://127.0.0.1:3000/api}
TOKEN_FILE=${TOKEN_FILE:-/home/ivan/fancyperu-dokploy-token}
SRC=${SRC:-/home/ivan/fancyperu-src}
STATE_FILE=/home/ivan/fancyperu-dokploy-compose-id
PROJECT_NAME=FANCYPERU
APP_NAME=${APP_NAME:-fancyperu-test}
# Canonical existing project (has Hello World); empty = match by name only.
PROJECT_ID=${PROJECT_ID:-ycQ3t9fqzprqXaBhGFybx}
COMPOSE_FILE=$SRC/deploy/dokploy/docker-compose.images.yml
ENV_FILE=/home/ivan/fancyperu-dokploy.env
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n 1 | cut -d= -f2)
STOREFRONT_DOMAIN=$(grep -oE '^STOREFRONT_DOMAIN=.*' "$ENV_FILE" | head -n 1 | cut -d= -f2)
S3_DOMAIN=$(grep -oE '^S3_DOMAIN=.*' "$ENV_FILE" | head -n 1 | cut -d= -f2)

DO_DEPLOY=0
for arg in "$@"; do
  case "$arg" in
    --deploy) DO_DEPLOY=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

[ -s "$TOKEN_FILE" ] || {
  echo "MISSING token file: $TOKEN_FILE" >&2
  echo "Generate it in the Dokploy UI (Settings > Profile > API/CLI) and store it:" >&2
  echo "  ssh ivan@192.168.1.38 'umask 077 && printf %s YOUR_TOKEN > $TOKEN_FILE && chmod 600 $TOKEN_FILE'" >&2
  exit 1
}
mode=$(stat -c '%a' "$TOKEN_FILE")
[ "$mode" = "600" ] || echo "WARN: token file mode is $mode (600 recommended)" >&2
[ -f "$COMPOSE_FILE" ] || { echo "missing $COMPOSE_FILE" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
envk=$(grep -cE "^[A-Za-z_][A-Za-z0-9_]*=" "$ENV_FILE")
if [ "${envk:-0}" -lt 40 ]; then
  echo "ERROR: $ENV_FILE has only ${envk:-0} keys (expected >=40) — refusing to save a corrupted env" >&2
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
if command -v jq >/dev/null 2>&1; then
  JSONTOOL=jq
elif command -v python3 >/dev/null 2>&1; then
  JSONTOOL=python3
else
  echo "jq or python3 is required for JSON handling" >&2
  exit 1
fi

HDR=$(mktemp)
P1=$(mktemp); P2=$(mktemp); P3=$(mktemp); T1=$(mktemp)
B1=$(mktemp); B2=$(mktemp); B3=$(mktemp)
trap 'rm -f "$HDR" "$P1" "$P2" "$P3" "$T1" "$B1" "$B2" "$B3"' EXIT
chmod 600 "$HDR" "$P1" "$P2" "$P3" "$T1" "$B1" "$B2" "$B3"
printf 'x-api-key: ' > "$HDR"
cat "$TOKEN_FILE" >> "$HDR"
printf '\n' >> "$HDR"

jsonstr() {
  if [ "$JSONTOOL" = jq ]; then jq -Rs .; else
    python3 -c 'import sys,json;sys.stdout.write(json.dumps(sys.stdin.read()))'
  fi
}

pyids() { # payload file -> projectId / environmentId / composeId (first found)
  python3 - "$1" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
out = {"projectId": "", "environmentId": "", "composeId": ""}
def walk(o):
    if isinstance(o, dict):
        for k in out:
            if not out[k] and isinstance(o.get(k), str):
                out[k] = o[k]
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(d)
print("projectId=%s" % out["projectId"])
print("environmentId=%s" % out["environmentId"])
print("composeId=%s" % out["composeId"])
PYEOF
}

pylookup() { # project payload file -> env= / composeId= (uses PROJECT_ID when set)
  python3 - "$1" "$PROJECT_NAME" "$APP_NAME" "${PROJECT_ID:-}" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
target, app, target_id = sys.argv[2], sys.argv[3], sys.argv[4]
env, compose = "", ""
def matches(o):
    if not isinstance(o, dict):
        return False
    if target_id:
        return o.get("projectId") == target_id
    return o.get("name") == target
def walk(o):
    global env, compose
    if isinstance(o, dict):
        if matches(o) and isinstance(o.get("environments"), list):
            for e in o["environments"]:
                if not env:
                    env = e.get("environmentId", "")
                for s in (e.get("compose") or []):
                    if isinstance(s, dict) and s.get("name") == app:
                        compose = s.get("composeId") or compose
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(d)
print("env=%s" % env)
print("composeId=%s" % compose)
PYEOF
}

pystatus() { # deployment list (or compose payload) -> deployment status
  python3 - "$1" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("unknown")
    sys.exit(0)
if isinstance(d, list):
    if d:
        print(d[0].get("status", "unknown"))
    else:
        print("empty")
elif isinstance(d, dict):
    print(d.get("composeStatus", "unknown"))
else:
    print("unknown")
PYEOF
}

pyerr() { # body file -> prints the error message if this is an API error
  python3 - "$1" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("")
    sys.exit(0)
if not isinstance(d, dict):
    print("")
    sys.exit(0)
code = d.get("code")
msg = d.get("message")
if code and code not in ("0", ""):
    issues = json.dumps(d.get("issues") or [])[:300]
    print("%s: %s %s" % (code, msg, issues))
else:
    print("")
PYEOF
}

api() { # method path body_file -> body saved to stdout-file? prints body
  m=$1; p=$2; f=${3:-}
  if [ -n "$f" ]; then
    curl -sS -m 60 -X "$m" \
      -H 'Content-Type: application/json' \
      --header "@$HDR" \
      --data "@$f" \
      -w '\nHTTP=%{http_code}' \
      "$BASE$p" 2>"$P1.err"
  else
    curl -sS -m 60 -X "$m" \
      -H 'Content-Type: application/json' \
      --header "@$HDR" \
      -w '\nHTTP=%{http_code}' \
      "$BASE$p" 2>"$P1.err"
  fi
}

die() { echo "ERROR: $*" >&2; exit 1; }

check() { # body_file expected_http
  httpv=$(grep -oE 'HTTP=[0-9]+' "$P1" | tail -n 1 | cut -d= -f2)
  if [ "${httpv:-000}" != "$2" ]; then
    echo "API returned HTTP ${httpv:-000} (expected $2):" >&2
    tail -c 500 "$P1" >&2
    exit 1
  fi
  # strip the appended HTTP marker so downstream JSON parsers see clean JSON
  grep -v '^HTTP=[0-9]*$' "$P1" > "$P1.tmp" 2>/dev/null && mv "$P1.tmp" "$P1"
  err=$(pyerr "$P1")
  [ -z "$err" ] || { echo "API error: $err" >&2; exit 1; }
}

echo "== 1. validating API token"
api GET /project.all > "$P1"
check "$P1" 200
cp "$P1" "$P2" 2>/dev/null

echo "== 2. locating or creating project $PROJECT_NAME"
pylookup "$P2" > "$P3"
env_id=$(grep -oE '^env=.*' "$P3" | head -n 1 | cut -d= -f2-)
compose_id=$(grep -oE '^composeId=.*' "$P3" | head -n 1 | cut -d= -f2-)
[ -n "$compose_id" ] && [ -f "$STATE_FILE" ] && compose_id=$(cat "$STATE_FILE")
echo "environmentId=${env_id:-<none>} existingComposeId=${compose_id:-<none>}"

if [ -z "$env_id" ]; then
  printf '{"name": ' > "$B1"
  printf '%s' "$PROJECT_NAME" | jsonstr >> "$B1"
  printf ', "description": ' >> "$B1"
  printf 'FANCYPERU private test stack (nip.io LAN test; no production data)' | jsonstr >> "$B1"
  printf '}' >> "$B1"
  api POST /project.create "$B1" > "$P1"
  check "$P1" 200
  pyids "$P1" > "$P3"
  proj_id=$(grep -oE '^projectId=.*' "$P3" | head -n 1 | cut -d= -f2-)
  env_id=$(grep -oE '^environmentId=.*' "$P3" | head -n 1 | cut -d= -f2-)
  echo "created project projectId=$proj_id environmentId=$env_id"
  [ -n "$env_id" ] || die "project creation did not return an environment id; stop (check the UI)"
fi

if [ -z "$compose_id" ]; then
  echo "== 3. creating compose service $APP_NAME"
  printf '{"name": ' > "$B2"
  printf '%s' "$APP_NAME" | jsonstr >> "$B2"
  printf ', "environmentId": ' >> "$B2"
  printf '%s' "$env_id" | jsonstr >> "$B2"
  printf ', "composeType": "docker-compose", "appName": ' >> "$B2"
  printf '%s' "$APP_NAME" | jsonstr >> "$B2"
  printf ', "composeFile": ' >> "$B2"
  cat "$COMPOSE_FILE" | jsonstr >> "$B2"
  printf '}' >> "$B2"
  api POST /compose.create "$B2" > "$P1"
  check "$P1" 200
  pyids "$P1" > "$P3"
  compose_id=$(grep -oE '^composeId=.*' "$P3" | head -n 1 | cut -d= -f2-)
  [ -n "$compose_id" ] || die "compose.create returned no composeId"
  echo "created compose composeId=$compose_id"
  printf '%s\n' "$compose_id" > "$STATE_FILE"
else
  echo "== 3. compose service already exists (composeId=$compose_id); updating in place"
fi

echo "== 4. update: sourceType=raw, createEnvFile=true"
printf '{"composeId": ' > "$B3"
printf '%s' "$compose_id" | jsonstr >> "$B3"
printf ', "sourceType": "raw", "createEnvFile": true, "composeType": "docker-compose", "randomize": false}' >> "$B3"
api POST /compose.update "$B3" > "$P1"
check "$P1" 200

echo "== 5. saving the private environment variables (values never printed)"
KEY_FILE=${KEY_FILE:-/home/ivan/fancyperu-publishable-key}
ENV_SRC=$ENV_FILE
if [ -s "$KEY_FILE" ]; then
  keyval=$(tr -d '[:space:]' < "$KEY_FILE" 2>/dev/null) || { echo "ERROR: cannot read $KEY_FILE — aborting before touching Dokploy env" >&2; exit 1; }
  case "$keyval" in
    pk_*) ;;
    *) echo "ERROR: $KEY_FILE is not a publishable token (expected pk_...) — aborting" >&2; exit 1 ;;
  esac
  cat "$ENV_FILE" | grep -E "^(NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)=" > /dev/null && \
  sed "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$keyval|" "$ENV_FILE" > "$T1" || { echo "ERROR: sed failed — aborting" >&2; exit 1; }
  chmod 600 "$T1"
  keycount=$(grep -cE "^[A-Za-z_][A-Za-z0-9_]*=" "$T1")
  if [ "$keycount" -lt 40 ]; then
    echo "ERROR: env derivation produced only $keycount keys (expected >=40) — aborting" >&2
    exit 1
  fi
  ENV_SRC=$T1
  echo "   publishable key override applied from $KEY_FILE (value not printed)"
else
  echo "   publishable key file absent: keeping bootstrap value from $ENV_FILE"
fi
printf '{"composeId": ' > "$B1"
printf '%s' "$compose_id" | jsonstr >> "$B1"
printf ', "env": ' >> "$B1"
cat "$ENV_SRC" | jsonstr >> "$B1"
printf '}' >> "$B1"
api POST /compose.saveEnvironment "$B1" > "$P1"
check "$P1" 200

if [ "$DO_DEPLOY" -eq 1 ]; then
  echo "== 6. deploy (queued by Dokploy)"
  printf '{"composeId": ' > "$B2"
  printf '%s' "$compose_id" | jsonstr >> "$B2"
  printf ', "title": ' >> "$B2"
  printf 'Initial private LAN deploy (Raw, prebuilt images)' | jsonstr >> "$B2"
  printf '}' >> "$B2"
  api POST /compose.deploy "$B2" > "$P1"
  check "$P1" 200

  echo "== 7. waiting for the deployment job (max ~12 min)"
  n=0
  while [ "$n" -lt 48 ]; do
    sleep 15
    n=$((n+1))
    api GET "/deployment.allByCompose?composeId=$compose_id" > "$P1"
    check "$P1" 200
    st=$(pystatus "$P1")
    echo "  composeStatus=$st (t=$((n*15))s)"
    case "$st" in
      done) break ;;
      error)
        echo "DEPLOYMENT FAILED — inspect the log in the Dokploy UI (fancyperu-test > Deployments)" >&2
        exit 1
        ;;
    esac
  done
  [ "$st" = "done" ] || echo "WARN: deployment still in progress after $((n*15))s" >&2
  sleep 10
fi

echo "== 8. URL checks through Traefik (Host header, raw status codes)"
for url in "$API_DOMAIN /health api-health" \
           "$STOREFRONT_DOMAIN /robots.txt storefront-robots" \
           "$S3_DOMAIN /minio/health/live minio-live"; do
  host=$(echo "$url" | cut -d' ' -f1)
  path=$(echo "$url" | cut -d' ' -f2)
  label=$(echo "$url" | cut -d' ' -f3)
  code=$(curl -sS -o /dev/null -m 10 -w '%{http_code}' -H "Host: $host" "http://127.0.0.1$path" 2>/dev/null || echo 000)
  case "$code" in
    200) echo "OK   $label http://$host$path -> $code" ;;
    301|302|307|308) echo "REDIRECT $label http://$host$path -> $code (Traefik redirects HTTP to HTTPS; needs the documented fallback)" ;;
    *) echo "FAIL $label http://$host$path -> $code" ;;
  esac
done

echo
echo "composeId=$compose_id (saved in $STATE_FILE)"
if [ "$DO_DEPLOY" -eq 1 ]; then
  echo "Verify containers with: sudo PROJECT=$APP_NAME sh $SRC/deploy/dokploy/verify-test-deploy.sh"
fi
