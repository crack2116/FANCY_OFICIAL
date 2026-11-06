#!/bin/sh
# ==============================================================================
# FANCYPERU - rotate the staging admin password via the OFFICIAL auth module
# service (`authModuleService.updateProvider("emailpass", ...)`) executed with
# `medusa exec` inside the staging backend container.
#
# Why this path: with MEDUSA_FF_RBAC=true the HTTP route
# POST /admin/users/:id/reset-password requires policy user:update and our
# staging admin JWT carries no app_metadata.roles -> 403 (verified: framework
# check-permissions.js throws Forbidden when roles are absent). The service
# method performs the exact same scrypt hash update server-side WITHOUT
# touching RBAC, permissions or any role.
#
# Scope (user constraints):
#   - same existing user staging-admin@fancyperu.test; no additional admins
#   - RBAC untouched; no global permissions
#   - no seed re-run; no commercial data touched; only the password hash
#
# RECOVERY:
#   /home/ivan/fancyperu-password-recovery (600, owner ivan) is written BEFORE
#   the mutation with the new seed-env content. Any failure after the change
#   preserves it and prints restoration instructions. On success it is removed.
#   If a recovery file exists at start:
#     * old password still logs in  -> earlier attempt never applied: stale,
#       removed, fresh flow
#     * recovery password logs in   -> the change DID apply: rotation resumes
#       with NO re-mutation; only verification + seed finalize run
#     * neither works               -> abort; nothing written, file preserved
#
# ORDER OF OPERATIONS:
#   Run this script FIRST. It rotates the password without requiring RBAC.
#   On success it writes /home/ivan/fancyperu-rotation-verified (mode 600,
#   owner ivan) only after verifying new=200 and old=401.
#   assign-staging-admin-role.sh refuses to assign role_super_admin until that
#   marker exists, belongs to this project, is newer than the seed env, and the
#   seed password authenticates. The marker contains no secrets.
#
# Scope: exactly project fancyperu-test-k6cmve and the existing user
#   staging-admin@fancyperu.test. No other project or user is touched.
#
# Transport: all HTTP checks target http://127.0.0.1 (host loopback only).
#
# Run with: sudo sh /home/ivan/fancyperu-src/deploy/dokploy/rotate-via-exec.sh
# (docker access requires root; every output file is installed with owner ivan,
# mode 600, so nothing on disk stays root-owned.)
# ==============================================================================
set -u
umask 077
# Fixed paths on purpose: this script is restricted to the private staging
# stack and must not be redirected to another environment by an env override.
SEED_FILE=/home/ivan/fancyperu-seed.env
ENV_FILE=/home/ivan/fancyperu-dokploy.env
RECOVERY_FILE=/home/ivan/fancyperu-password-recovery
ROTATION_OK_FILE=/home/ivan/fancyperu-rotation-verified
RUNTIME_SCRIPT=/home/ivan/fancyperu-src/deploy/dokploy/runtime-rotate-staging-password.js

PROJECT=fancyperu-test-k6cmve
TARGET_EMAIL=staging-admin@fancyperu.test

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
stage_ok() { printf 'PASS %s\n' "$1"; }

[ -f "$RUNTIME_SCRIPT" ] || fail "missing container script $RUNTIME_SCRIPT"
[ -f "$ENV_FILE" ] || fail "missing $ENV_FILE"
[ -f "$SEED_FILE" ] || fail "missing $SEED_FILE"
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2-)
[ -n "$API_DOMAIN" ] || fail "API_DOMAIN not found in $ENV_FILE"

TMP=$(mktemp -d)
chmod 700 "$TMP"
cleanup() {
  if [ -n "${BACKEND:-}" ]; then
    docker exec -u root "$BACKEND" rm -f /app/apps/backend/.medusa/server/src/scripts/fancyperu-rotate.js >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
jqstr() { printf '%s' "$1" | jq -Rs .; }

req() { # method path bodyfile hdrfile outfile -> prints http code
  m=$1; p=$2; f=${3:-}; h=${4:-}; o=$5
  if [ -n "$f" ] && [ -n "$h" ]; then
    r=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      --header @"$h" --data @"$f" \
      "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  elif [ -n "$f" ]; then
    r=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      --data @"$f" "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  elif [ -n "$h" ]; then
    r=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      --header @"$h" "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  else
    r=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  fi
  printf '%s' "$r"
}

login_code() { # email password outfile-name -> http code
  printf '{"email": %s, "password": %s}\n' "$(jqstr "$1")" "$(jqstr "$2")" > "$TMP/login.json"
  chmod 600 "$TMP/login.json"
  req POST /auth/user/emailpass "$TMP/login.json" "" "$TMP/$3"
}

# --- 0. inventory: which password is actually live? ----------------------------
RECOVERY_ADOPTED=0
rec_pw=""; rec_email=""
old_pw=$(grep -E '^STAGING_ADMIN_PASSWORD=' "$SEED_FILE" | head -n1 | cut -d= -f2-)
email=$(grep -E '^STAGING_ADMIN_EMAIL=' "$SEED_FILE" | head -n1 | cut -d= -f2-)
[ -n "$old_pw" ] && [ -n "$email" ] || fail "seed env incomplete"
[ "$email" = "$TARGET_EMAIL" ] || fail "seed env targets a different admin; refusing"

code=$(login_code "$email" "$old_pw" "oldprobe.out")
if [ "$code" = "200" ]; then
  echo "PASS 0a: seed (old) password still authenticates"
elif [ -s "$RECOVERY_FILE" ]; then
  rec_pw=$(grep -E '^STAGING_ADMIN_PASSWORD=' "$RECOVERY_FILE" | head -n1 | cut -d= -f2-)
  rec_email=$(grep -E '^STAGING_ADMIN_EMAIL=' "$RECOVERY_FILE" | head -n1 | cut -d= -f2-)
  code=$(login_code "$rec_email" "$rec_pw" "recprobe.out")
  if [ "$code" = "200" ]; then
    RECOVERY_ADOPTED=1
    email="$rec_email"
    echo "PASS 0b: recovery password is LIVE (earlier attempt applied) - resuming without re-mutation"
  else
    fail "neither seed password nor recovery password authenticates; state unknown - nothing changed, preserving $RECOVERY_FILE"
  fi
else
  fail "old password does not authenticate and there is no recovery file; state unknown - nothing changed"
fi

NEW_PW=""
if [ "$RECOVERY_ADOPTED" = "0" ]; then
  # seed password is live: any existing recovery file is stale (never applied).
  rm -f "$RECOVERY_FILE"
  NEW_PW=$(openssl rand -hex 16) || fail "openssl failed"
  # persist recovery BEFORE the mutation; must end up owned by ivan, or abort
  {
    printf 'STAGING_ADMIN_EMAIL=%s\n' "$email"
    printf 'STAGING_ADMIN_PASSWORD=%s\n' "$NEW_PW"
  } > "$TMP/rec.new"
  install -m 600 -o ivan -g ivan "$TMP/rec.new" "$RECOVERY_FILE" \
    || fail "could not persist recovery file as ivan-owned; aborted BEFORE any mutation"
  # Clear the marker only now, immediately before the mutation: if this run
  # fails before touching the password, a previous valid marker stays valid.
  rm -f "$ROTATION_OK_FILE" || fail "could not clear the previous rotation marker"
  stage_ok "recovery file written (600, owner ivan)"
else
  # The earlier attempt applied the mutation but verification failed. Resume
  # with the recovery password instead of generating another one. This is the
  # fix for the previous empty-NEW_PW bug in the recovery path.
  NEW_PW="$rec_pw"
  [ -n "$NEW_PW" ] || fail "recovery file has no usable password; preserving it"
  [ "$email" = "$TARGET_EMAIL" ] || fail "recovery file targets a different admin; preserving it"
  # The failed attempt may have left a stale marker. It is rewritten only after
  # the checks below pass.
  rm -f "$ROTATION_OK_FILE" || fail "could not clear a stale rotation marker"
  stage_ok "recovery password adopted; no second mutation will run"
fi

if [ "$RECOVERY_ADOPTED" = "0" ]; then
  # --- 1. locate the staging backend container ---------------------------------
  BACKEND=""
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

  # --- 2. verify the build-artifacts directory, ship script + env file ---------
  docker exec "$BACKEND" sh -c 'test -d /app/apps/backend/.medusa/server/src/scripts' >/dev/null 2>&1 \
    || fail "container lacks /app/apps/backend/.medusa/server/src/scripts"
  docker cp "$RUNTIME_SCRIPT" "$BACKEND":/app/apps/backend/.medusa/server/src/scripts/fancyperu-rotate.js \
    || fail "docker cp of the rotation script failed"
  rotation_env=$TMP/rotation.env
  {
    printf 'STAGING_ADMIN_EMAIL=%s\n' "$email"
    printf 'STAGING_ROTATION_PASSWORD=%s\n' "$NEW_PW"
  } > "$rotation_env"
  chmod 600 "$rotation_env"

  # --- 3. medusa exec the official service method -------------------------------
  EXEC_RC=0
  out=$(docker exec --env-file "$rotation_env" "$BACKEND" sh -c \
    'cd /app/apps/backend/.medusa/server && node ../../node_modules/@medusajs/cli/cli.js exec ./src/scripts/fancyperu-rotate.js' 2>&1) || EXEC_RC=$?
  rm -f "$rotation_env"
  docker exec -u root "$BACKEND" rm -f /app/apps/backend/.medusa/server/src/scripts/fancyperu-rotate.js >/dev/null 2>&1 || true
  echo "medusa exec rc=$EXEC_RC"
  if [ "$EXEC_RC" != "0" ]; then
    safe_out=$(printf '%s\n' "$out" | grep 'FANCYPERU_' || true)
    if [ -n "$safe_out" ]; then
      printf '%s\n' "$safe_out" >&2
    else
      printf 'The runtime script failed without a sanitized code; inspect the container logs.\n' >&2
    fi
    printf 'The password change may or may not have applied. Do NOT assume either password works.\n'
    printf 'RECOVERY: the new password is stored in %s (mode 600, never printed).\n' "$RECOVERY_FILE"
    exit 1
  fi
  stage_ok "authModuleService.updateProvider executed inside the container"
fi

# --- 4. verification through Traefik (loopback HTTP) ---------------------------
code=$(login_code "$email" "$NEW_PW" "newcheck.out")
n=0
while [ "$code" != "200" ] && [ "$n" -lt 2 ]; do
  n=$((n+1)); sleep 2; code=$(login_code "$email" "$NEW_PW" "newcheck.out")
done
if [ "$code" = "200" ]; then
  stage_ok "new password authenticates"
else
  printf 'FAIL: new password does NOT authenticate (code %s)\n' "$code" >&2
  printf 'RECOVERY file preserved: %s (never printed)\n' "$RECOVERY_FILE"
  exit 1
fi

code=$(login_code "$email" "$old_pw" "oldcheck.out")
if [ "$code" = "401" ]; then
  stage_ok "old password rejected with 401"
elif [ "$code" = "200" ]; then
  fail "old password still active - inconsistent state; nothing finalized (recovery file preserved)"
else
  printf 'FAIL: old password check returned %s (expected 401); recovery file preserved\n' "$code" >&2
  exit 1
fi

# --- 5. finalize the seed env file and write the verification marker ----------
{
  printf 'STAGING_ADMIN_EMAIL=%s\n' "$email"
  printf 'STAGING_ADMIN_PASSWORD=%s\n' "$NEW_PW"
} > "$TMP/seed.new"
chmod 600 "$TMP/seed.new"
install -m 600 -o ivan -g ivan "$TMP/seed.new" "$SEED_FILE" \
  || fail "rotation applied but seed env update failed; recovery file PRESERVED at $RECOVERY_FILE"

# The marker is the gate for assign-staging-admin-role.sh. It contains no
# secrets and is written only after both HTTP checks above passed.
{
  printf 'ROTATION_STATUS=verified\n'
  printf 'ROTATION_VERIFIED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'PROJECT=%s\n' "$PROJECT"
  printf 'NEW_PASSWORD_LOGIN=200\n'
  printf 'OLD_PASSWORD_LOGIN=401\n'
} > "$TMP/marker.new"
chmod 600 "$TMP/marker.new"
install -m 600 -o ivan -g ivan "$TMP/marker.new" "$ROTATION_OK_FILE" \
  || fail "password rotated and seed env updated, but the verification marker could not be written; recovery file PRESERVED"

rm -f "$RECOVERY_FILE"
unset NEW_PW old_pw rec_pw
. "$SEED_FILE"
if [ -n "${STAGING_ADMIN_EMAIL:-}" ] && [ -n "${STAGING_ADMIN_PASSWORD:-}" ]; then
  echo "ROTATION COMPLETE: $SEED_FILE updated (mode $(stat -c '%a' "$SEED_FILE")), recovery removed"
  echo "VERIFICATION MARKER: $ROTATION_OK_FILE (mode $(stat -c '%a' "$ROTATION_OK_FILE"))"
else
  fail "seed env did not reload after replace"
fi
