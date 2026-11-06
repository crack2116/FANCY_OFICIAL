#!/bin/sh
# ==============================================================================
# FANCYPERU - assign role_super_admin to the EXISTING staging admin.
#
# This script is intentionally narrow:
#   - project:  fancyperu-test-k6cmve only (exact Docker Compose label)
#   - user:     staging-admin@fancyperu.test only (existing user, never created)
#   - role:     role_super_admin only (existing role, never created)
#
# It uses only official Medusa services through `medusa exec`:
#   - query.graph to read the user and its current rbac_roles links
#   - rbacModuleService.listRbacRoles to confirm the role exists
#   - the official module-link service (ContainerRegistrationKeys.LINK) to
#     create or dismiss the user <-> rbac_role link
#
# No SQL, no seed, no password change, no Docker service change, no commercial
# data. The only mutation is one module-link row.
#
# ORDER OF OPERATIONS (enforced):
#   1. rotate-via-exec.sh changes the exposed password and writes
#      /home/ivan/fancyperu-rotation-verified only after verifying:
#        new password -> 200 and old password -> 401.
#   2. This script refuses to assign the role unless that marker exists, belongs
#      to this project, is newer than the seed env, and the current seed
#      password authenticates. If the role is already assigned, the marker is
#      not required again (idempotent re-run).
#
# MODES:
#   (default)   assign role_super_admin, then verify JWT and admin routes
#   --status    read-only: show whether the role is currently assigned
#   --rollback  remove ONLY the role_super_admin link; keep user and password
#
# Run with:
#   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/assign-staging-admin-role.sh
#   sudo sh .../assign-staging-admin-role.sh --status
#   sudo sh .../assign-staging-admin-role.sh --rollback
#
# Docker access requires root. The script never prints passwords, tokens or
# private environment values; runtime output is filtered to FANCYPERU_ lines.
# ==============================================================================
set -u
umask 077

# Fixed paths on purpose: this script is restricted to the private staging
# stack and must not be redirected to another environment by an env override.
SEED_FILE=/home/ivan/fancyperu-seed.env
ENV_FILE=/home/ivan/fancyperu-dokploy.env
RECOVERY_FILE=/home/ivan/fancyperu-password-recovery
ROTATION_OK_FILE=/home/ivan/fancyperu-rotation-verified
RUNTIME_SCRIPT=/home/ivan/fancyperu-src/deploy/dokploy/runtime-staging-admin-role.js

PROJECT=fancyperu-test-k6cmve
TARGET_EMAIL=staging-admin@fancyperu.test
ROLE_ID=role_super_admin
REMOTE_SCRIPT=/app/apps/backend/.medusa/server/src/scripts/fancyperu-role.js

ACTION=assign

usage() {
  cat <<'EOF'
Usage: sudo sh assign-staging-admin-role.sh [--status|--rollback]

  (default)   assign role_super_admin to the existing staging admin after
              verifying that the password rotation was completed first
  --status    read-only: show whether the role is currently assigned
  --rollback  remove only the role_super_admin link; user and password remain

Targets exactly project fancyperu-test-k6cmve and user
staging-admin@fancyperu.test. Never creates users or roles, never changes
passwords, never prints secrets.
EOF
}

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

stage_ok() {
  printf 'PASS %s\n' "$1"
}

for arg in "$@"; do
  case "$arg" in
    --rollback) ACTION=revoke ;;
    --status) ACTION=status ;;
    --help|-h) usage; exit 0 ;;
    *)
      printf 'unknown argument: %s\n' "$arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[ -f "$RUNTIME_SCRIPT" ] || fail "missing runtime script $RUNTIME_SCRIPT"
[ -f "$ENV_FILE" ] || fail "missing $ENV_FILE"
[ -f "$SEED_FILE" ] || fail "missing $SEED_FILE"

API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2-)
[ -n "$API_DOMAIN" ] || fail "API_DOMAIN not found in $ENV_FILE"

email=$(grep -E '^STAGING_ADMIN_EMAIL=' "$SEED_FILE" | head -n1 | cut -d= -f2-)
pw=$(grep -E '^STAGING_ADMIN_PASSWORD=' "$SEED_FILE" | head -n1 | cut -d= -f2-)
[ -n "$email" ] && [ -n "$pw" ] || fail "seed env incomplete"
[ "$email" = "$TARGET_EMAIL" ] || fail "seed env does not target the authorized staging admin; refusing"

command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"
docker ps >/dev/null 2>&1 || fail "docker access requires root/sudo"

TMP=$(mktemp -d)
chmod 700 "$TMP"
BACKEND=""
AUTH_TOKEN=""
payload=""

cleanup() {
  unset AUTH_TOKEN payload 2>/dev/null || true
  if [ -n "$BACKEND" ]; then
    docker exec -u root "$BACKEND" rm -f "$REMOTE_SCRIPT" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

jqstr() {
  printf '%s' "$1" | jq -Rs .
}

# ---------------------------------------------------------------------------
# Locate exactly one running backend for the authorized project.
# ---------------------------------------------------------------------------
BACKEND_COUNT=0
for id in $(docker ps -q --filter "label=com.docker.compose.service=fancyperu-backend"); do
  p=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null) || continue
  if [ "$p" = "$PROJECT" ]; then
    BACKEND=$id
    BACKEND_COUNT=$((BACKEND_COUNT + 1))
  fi
done
[ "$BACKEND_COUNT" -eq 1 ] || fail "expected exactly one backend container in project $PROJECT, found $BACKEND_COUNT"
[ "$(docker inspect -f '{{.State.Running}}' "$BACKEND" 2>/dev/null)" = "true" ] || fail "backend container is not running"
stage_ok "backend container located in $PROJECT"

rbac_flag=$(docker exec "$BACKEND" printenv MEDUSA_FF_RBAC 2>/dev/null || true)
[ "$rbac_flag" = "true" ] || fail "MEDUSA_FF_RBAC is not true in the staging backend; refusing to change roles"

docker exec "$BACKEND" sh -c 'test -d /app/apps/backend/.medusa/server/src/scripts' >/dev/null 2>&1 \
  || fail "container lacks /app/apps/backend/.medusa/server/src/scripts"
docker cp "$RUNTIME_SCRIPT" "$BACKEND:$REMOTE_SCRIPT" >/dev/null \
  || fail "docker cp of the role runtime script failed"
stage_ok "role runtime script staged"

# ---------------------------------------------------------------------------
# Runtime invocation. Only FANCYPERU_ lines are printed; raw output is dropped
# so a framework error can never leak a secret or a private value.
# ---------------------------------------------------------------------------
run_runtime() {
  _action=$1
  _envf=$TMP/runtime-$_action.env
  {
    printf 'STAGING_ADMIN_EMAIL=%s\n' "$TARGET_EMAIL"
    printf 'TARGET_ROLE_ID=%s\n' "$ROLE_ID"
    printf 'FANCYPERU_ROLE_ACTION=%s\n' "$_action"
  } > "$_envf"
  chmod 600 "$_envf"

  _rc=0
  _out=$(docker exec --env-file "$_envf" "$BACKEND" sh -c \
    'cd /app/apps/backend/.medusa/server && node ../../node_modules/@medusajs/cli/cli.js exec ./src/scripts/fancyperu-role.js' 2>&1) || _rc=$?
  rm -f "$_envf"

  _safe=$(printf '%s\n' "$_out" | grep 'FANCYPERU_' || true)
  if [ -n "$_safe" ]; then
    printf '%s\n' "$_safe"
  fi
  return "$_rc"
}

parse_field() {
  # $1: text, $2: key -> value of key=value token
  printf '%s\n' "$1" | tr ' ' '\n' | sed -n "s/^$2=//p" | head -n1
}

# ---------------------------------------------------------------------------
# Read-only status. This is also the idempotence precheck.
# ---------------------------------------------------------------------------
if ! status_out=$(run_runtime status); then
  if [ -n "$status_out" ]; then
    printf '%s\n' "$status_out" >&2
  fi
  fail "status check failed; no changes made"
fi
printf '%s\n' "$status_out"

status_line=$(printf '%s\n' "$status_out" | grep 'FANCYPERU_ROLE_STATUS' | head -n1)
[ -n "$status_line" ] || fail "role status line missing; no changes made"
assigned=$(parse_field "$status_line" assigned)
user_id=$(parse_field "$status_line" user_id)
role_id=$(parse_field "$status_line" role_id)

case "$assigned" in
  yes|no) ;;
  *) fail "could not parse role status; no changes made" ;;
esac
[ -n "$user_id" ] && [ -n "$role_id" ] || fail "role status is incomplete; no changes made"
[ "$role_id" = "$ROLE_ID" ] || fail "unexpected role id from runtime; no changes made"

if [ "$ACTION" = "status" ]; then
  echo "STATUS: $ROLE_ID assigned=$assigned (user_id=$user_id, role_id=$role_id)"
  exit 0
fi

# ---------------------------------------------------------------------------
# Assign only after the password rotation has been verified.
# If the role is already assigned, the marker is not required again.
# ---------------------------------------------------------------------------
if [ "$ACTION" = "assign" ] && [ "$assigned" = "no" ]; then
  [ -f "$ROTATION_OK_FILE" ] || fail "rotation marker missing; run rotate-via-exec.sh first; no changes made"
  [ ! -f "$RECOVERY_FILE" ] || fail "recovery file present; resolve the password state first; no changes made"
  grep -qx 'ROTATION_STATUS=verified' "$ROTATION_OK_FILE" \
    || fail "rotation marker is not verified; no changes made"
  grep -qx "PROJECT=$PROJECT" "$ROTATION_OK_FILE" \
    || fail "rotation marker belongs to another project; no changes made"
  grep -qx 'NEW_PASSWORD_LOGIN=200' "$ROTATION_OK_FILE" \
    || fail "rotation marker lacks NEW_PASSWORD_LOGIN=200; no changes made"
  grep -qx 'OLD_PASSWORD_LOGIN=401' "$ROTATION_OK_FILE" \
    || fail "rotation marker lacks OLD_PASSWORD_LOGIN=401; no changes made"

  seed_mtime=$(stat -c %Y "$SEED_FILE" 2>/dev/null || echo 0)
  mark_mtime=$(stat -c %Y "$ROTATION_OK_FILE" 2>/dev/null || echo 0)
  [ "$seed_mtime" -le "$mark_mtime" ] \
    || fail "seed env is newer than the rotation marker; re-run rotation verification; no changes made"
  stage_ok "password rotation was verified before role assignment"
elif [ "$ACTION" = "assign" ]; then
  stage_ok "role is already assigned; assignment is idempotent"
fi

# ---------------------------------------------------------------------------
# Verify the current password before any mutation. This is the password that
# rotate-via-exec.sh wrote to the seed env; it is never printed.
# ---------------------------------------------------------------------------
login_check() {
  printf '{"email": %s, "password": %s}\n' "$(jqstr "$TARGET_EMAIL")" "$(jqstr "$pw")" > "$TMP/login.json"
  chmod 600 "$TMP/login.json"

  code=$(curl -sS -m 20 -o "$TMP/auth.json" -w '%{http_code}' \
    -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
    --data @"$TMP/login.json" \
    "http://127.0.0.1/auth/user/emailpass" 2>/dev/null || true)
  rm -f "$TMP/login.json"

  [ "$code" = "200" ] || return 1
  AUTH_TOKEN=$(jq -r '.token // ""' "$TMP/auth.json")
  [ -n "$AUTH_TOKEN" ] || return 1
  printf 'authorization: Bearer %s\n' "$AUTH_TOKEN" > "$TMP/admin.hdr"
  chmod 600 "$TMP/admin.hdr"
  rm -f "$TMP/auth.json"
  return 0
}

login_check || fail "current seed password does not authenticate; no changes made"
stage_ok "current seed password authenticates"

# ---------------------------------------------------------------------------
# The only mutation: official module-link create or dismiss.
# ---------------------------------------------------------------------------
if [ "$ACTION" = "assign" ]; then
  if ! result_out=$(run_runtime assign); then
    if [ -n "$result_out" ]; then
      printf '%s\n' "$result_out" >&2
    fi
    fail "role assignment failed; no password or seed change was made"
  fi
else
  if ! result_out=$(run_runtime revoke); then
    if [ -n "$result_out" ]; then
      printf '%s\n' "$result_out" >&2
    fi
    fail "role rollback failed; no password or seed change was made"
  fi
fi
printf '%s\n' "$result_out"

result_line=$(printf '%s\n' "$result_out" | grep 'FANCYPERU_ROLE_RESULT' | head -n1)
[ -n "$result_line" ] || fail "role result line missing; inspect with --status"
result_action=$(parse_field "$result_line" action)
result_user_id=$(parse_field "$result_line" user_id)
result_role_id=$(parse_field "$result_line" role_id)
[ "$result_user_id" = "$user_id" ] || fail "identity changed between status and mutation; inspect with --status"
[ "$result_role_id" = "$ROLE_ID" ] || fail "role changed between status and mutation; inspect with --status"

if [ "$ACTION" = "assign" ]; then
  case "$result_action" in
    assigned|already_assigned) ;;
    *) fail "unexpected assignment result; inspect with --status" ;;
  esac
  stage_ok "role link is present"
else
  case "$result_action" in
    revoked|not_assigned) ;;
    *) fail "unexpected rollback result; inspect with --status" ;;
  esac
  stage_ok "role link is absent"
fi

# ---------------------------------------------------------------------------
# Post-verification through Traefik loopback: new login, JWT roles, routes.
# ---------------------------------------------------------------------------
decode_jwt() {
  payload=$(printf '%s' "$AUTH_TOKEN" | cut -d. -f2 | tr '_-' '/+' | \
    awk '{l=length($0)%4; if(l==2)$0=$0"=="; else if(l==3)$0=$0"="; print}' | \
    base64 -d 2>/dev/null)
  [ -n "$payload" ] || return 1
  jwt_actor=$(printf '%s' "$payload" | jq -r '.actor_id // ""')
  jwt_roles_count=$(printf '%s' "$payload" | jq -r '(.app_metadata.roles // []) | length')
  jwt_has_role=$(printf '%s' "$payload" | jq -r --arg r "$ROLE_ID" '((.app_metadata.roles // []) | index($r)) != null')
  return 0
}

login_check || fail "post-change login failed; inspect with --status"
decode_jwt || fail "could not decode the new JWT; inspect with --status"
[ "$jwt_actor" = "$user_id" ] || fail "JWT actor does not match the target user; inspect with --status"

if [ "$ACTION" = "assign" ] && [ "$jwt_has_role" != "true" ]; then
  sleep 2
  login_check || fail "post-change login retry failed; inspect with --status"
  decode_jwt || fail "could not decode the new JWT on retry; inspect with --status"
  [ "$jwt_actor" = "$user_id" ] || fail "JWT actor does not match the target user; inspect with --status"
fi

if [ "$ACTION" = "revoke" ] && [ "$jwt_has_role" = "true" ]; then
  sleep 2
  login_check || fail "post-rollback login retry failed; inspect with --status"
  decode_jwt || fail "could not decode the JWT on retry; inspect with --status"
  [ "$jwt_actor" = "$user_id" ] || fail "JWT actor does not match the target user; inspect with --status"
fi

if [ "$ACTION" = "assign" ]; then
  [ "$jwt_has_role" = "true" ] \
    || fail "new JWT does not include $ROLE_ID; the link exists but the token was not refreshed. Inspect with --status."
  stage_ok "new JWT includes $ROLE_ID ($jwt_roles_count role(s))"
else
  [ "$jwt_has_role" = "false" ] \
    || fail "JWT still includes $ROLE_ID after rollback; inspect with --status"
  stage_ok "new JWT no longer includes $ROLE_ID ($jwt_roles_count role(s))"
fi

http_get() {
  _path=$1
  _code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' \
    -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
    --header @"$TMP/admin.hdr" \
    "http://127.0.0.1$_path" 2>/dev/null) || _code=000
  printf '%s' "$_code"
}

http_get_public() {
  _path=$1
  _code=$(curl -sS -m 20 -o /dev/null -L -w '%{http_code}' \
    -H "Host: $API_DOMAIN" \
    "http://127.0.0.1$_path" 2>/dev/null) || _code=000
  printf '%s' "$_code"
}

if [ "$ACTION" = "assign" ]; then
  for path in "/admin/users?limit=1" "/admin/products?limit=1" "/admin/users/me"; do
    code=$(http_get "$path")
    echo "GET $path -> $code"
    [ "$code" = "200" ] || fail "expected 200 from $path; role link exists but access is still denied. Inspect with --status."
  done

  code=$(http_get_public "/app")
  echo "GET /app -> $code"
  [ "$code" = "200" ] || fail "admin panel did not return 200 after redirects; inspect with --status"
  stage_ok "admin API and panel are reachable"

  echo "ASSIGNMENT COMPLETE: $ROLE_ID is linked to the existing staging admin."
  echo "Password was not changed by this script; the seed env was not modified."
else
  code=$(http_get "/admin/users/me")
  echo "GET /admin/users/me -> $code"
  [ "$code" = "200" ] || fail "expected 200 from /admin/users/me after rollback; inspect with --status"

  code=$(http_get "/admin/users?limit=1")
  echo "GET /admin/users?limit=1 -> $code"
  if [ "$code" = "403" ]; then
    echo "EXPECTED 403 after rollback: the admin has no RBAC role."
  else
    echo "NOTE: /admin/users returned $code; another role may still grant access."
  fi

  code=$(http_get_public "/app")
  echo "GET /app -> $code"
  [ "$code" = "200" ] || fail "admin panel did not return 200 after redirects; inspect with --status"

  echo "ROLLBACK COMPLETE: $ROLE_ID link removed. User and password are unchanged."
  echo "Policy-protected admin routes may return 403 again until a role is assigned."
fi

unset AUTH_TOKEN payload
