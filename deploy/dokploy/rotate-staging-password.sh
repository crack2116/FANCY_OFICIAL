#!/bin/sh
# ==============================================================================
# FANCYPERU - rotate the staging admin password using the SUPPORTED Medusa
# reset-password flow (>= 2.20). The EXISTING admin keeps its identity; no
# resender, no email, no full re-seed. Requirements honored:
#   - new random password (openssl rand -hex 16), never printed or logged
#   - old password must be invalid afterwards (verified: expects 401)
#   - /home/ivan/fancyperu-seed.env updated in place, mode 600 preserved
#   - payloads built in 0600 temp files so tool errors can NEVER leak secrets
#
# RECOVERY: the new password is persisted BEFORE the mutation in
#   $RECOVERY_FILE (=/home/ivan/fancyperu-password-recovery, mode 600, owner
#   ivan, exact seed-env content). If the password change happened but the
#   post-checks fail, the recovery file survives (any exit path) and the
#   script prints restoration instructions. On complete success it is
#   DELETED (the password then lives only in the seed env file).
#
# TRANSPORT: every request targets http://127.0.0.1 (host loopback) against
# the Traefik container's published port 80. Loopback traffic never leaves
# the host; no LAN/Internet hop exists. No other endpoints are contacted.
#
# Runs as ivan on the Dokploy host. No sudo. Nothing destructive: the only
# mutation is the staging admin password (and the consumed reset-token row).
# ==============================================================================
set -u
SEED_FILE=${SEED_FILE:-/home/ivan/fancyperu-seed.env}
ENV_FILE=${ENV_FILE:-/home/ivan/fancyperu-dokploy.env}
RECOVERY_FILE=${RECOVERY_FILE:-/home/ivan/fancyperu-password-recovery}
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
chmod 700 "$TMP"
jqstr() { printf '%s' "$1" | jq -Rs .; }   # safe JSON string quoting

old_pw=$(grep -E '^STAGING_ADMIN_PASSWORD=' "$SEED_FILE" | head -n1 | cut -d= -f2)
staging_email=$(grep -E '^STAGING_ADMIN_EMAIL=' "$SEED_FILE" | head -n1 | cut -d= -f2)
[ -n "$old_pw" ] || { printf 'FAIL: no STAGING_ADMIN_PASSWORD in %s\n' "$SEED_FILE" >&2; exit 1; }
[ -n "$staging_email" ] || { printf 'FAIL: no STAGING_ADMIN_EMAIL in %s\n' "$SEED_FILE" >&2; exit 1; }

req() { # method path bodyfile hdrfile outfile -> prints http code
  m=$1; p=$2; f=${3:-}; h=${4:-}; o=$5
  if [ -n "$f" ]; then
    code=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      --header @"$h" --data @"$f" \
      "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  else
    code=$(curl -sS -m 20 -X "$m" -o "$o" -w '%{http_code}' \
      -H "Host: $API_DOMAIN" -H 'Content-Type: application/json' \
      --header @"$h" \
      "http://127.0.0.1$p" 2>"$TMP/last.err" || true)
  fi
  printf '%s' "$code"
}
h_none() { : > "$TMP/none"; }
h_none

recovery_write() {  # persist the NEW password (and email) before/at mutation
  {
    printf 'STAGING_ADMIN_EMAIL=%s\n' "$staging_email"
    printf 'STAGING_ADMIN_PASSWORD=%s\n' "$NEW_PW"
  } > "$TMP/rec.new"
  chmod 600 "$TMP/rec.new"
  mv "$TMP/rec.new" "$RECOVERY_FILE"
  chmod 600 "$RECOVERY_FILE"
}
recovery_note() {
  printf 'RECOVERY: the password change already took effect but verification failed.\n'
  printf 'The NEW password is safely stored in %s (mode 600, never printed).\n' "$RECOVERY_FILE"
  printf 'Restore it to the seed env (any ssh session, no sudo):\n'
  printf '  mv %s %s && chmod 600 %s\n' "$RECOVERY_FILE" "$SEED_FILE" "$SEED_FILE"
  printf 'Then re-verify with:\n'
  printf '  sh /home/ivan/fancyperu-src/deploy/dokploy/check-admin.sh\n'
}

# prebuild the OLD-credential payload once; used late (step 6) and in the
# ambiguous-update fallback path of step 4.
printf '{"email": %s, "password": %s}\n' "$(jqstr "$staging_email")" "$(jqstr "$old_pw")" > "$TMP/oldlogin.json"
chmod 600 "$TMP/oldlogin.json"

# --- step 1: login with current credentials -----------------------------------
printf '{"email": %s, "password": %s}\n' "$(jqstr "$staging_email")" "$(jqstr "$old_pw")" > "$TMP/login.json"
chmod 600 "$TMP/login.json"
code=$(req POST /auth/user/emailpass "$TMP/login.json" "$TMP/none" "$TMP/auth.json")
[ "$code" = "200" ] || { printf 'FAIL: login with current credentials returned %s\n' "$code" >&2; exit 1; }
auth_token=$(jq -r '.token // ""' "$TMP/auth.json")
[ -n "$auth_token" ] || { printf 'FAIL: login response has no token\n' >&2; exit 1; }
printf 'authorization: Bearer %s\n' "$auth_token" > "$TMP/admin.hdr"
chmod 600 "$TMP/admin.hdr"
unset auth_token
rm -f "$TMP/auth.json" "$TMP/login.json"
echo "PASS step 1/6 login with current credentials"

# --- step 2: identify the admin user ------------------------------------------
code=$(req GET /admin/users/me "" "$TMP/admin.hdr" "$TMP/me.json")
[ "$code" = "200" ] || { printf 'FAIL: /admin/users/me returned %s\n' "$code" >&2; exit 1; }
user_id=$(jq -r '.user.id // ""' "$TMP/me.json")
[ -n "$user_id" ] || { printf 'FAIL: /admin/users/me has no user id\n' >&2; exit 1; }
echo "PASS step 2/6 admin identity resolved"

# --- step 3: obtain a single-use reset token ----------------------------------
code=$(req POST "/admin/users/$user_id/reset-password" "" "$TMP/admin.hdr" "$TMP/reset.json")
[ "$code" = "200" ] || { printf 'FAIL: reset-password grant returned %s\n' "$code" >&2; exit 1; }
reset_token=$(jq -r '.token // ""' "$TMP/reset.json")
[ -n "$reset_token" ] || { printf 'FAIL: no reset token returned\n' >&2; exit 1; }
printf 'authorization: Bearer %s\n' "$reset_token" > "$TMP/reset.hdr"
chmod 600 "$TMP/reset.hdr"
unset reset_token
rm -f "$TMP/reset.json"
echo "PASS step 3/6 single-use reset token issued"

# --- step 4: set the NEW password (the only mutation) --------------------------
NEW_PW=$(openssl rand -hex 16)
recovery_write   # persist FIRST: any failure/crash after this is recoverable
printf '{"password": %s}\n' "$(jqstr "$NEW_PW")" > "$TMP/update.json"
chmod 600 "$TMP/update.json"
code=$(req POST /auth/user/emailpass/update "$TMP/update.json" "$TMP/reset.hdr" "$TMP/upd.json")
rm -f "$TMP/update.json"
if [ "$code" = "200" ] && jq -e '.success == true' "$TMP/upd.json" >/dev/null 2>&1; then
  echo "PASS step 4/6 password updated for the existing staging admin"
else
  # Ambiguous case: a timeout/lost response may still have changed the password.
  # Verify with the NEW password (2 probes), then with the OLD one, before any
  # claim about the resulting state.
  printf '{"email": %s, "password": %s}\n' "$(jqstr "$staging_email")" "$(jqstr "$NEW_PW")" > "$TMP/probe.json"
  chmod 600 "$TMP/probe.json"
  code=""
  n=0
  while [ "$n" -lt 2 ]; do
    code=$(req POST /auth/user/emailpass "$TMP/probe.json" "$TMP/none" "$TMP/probe.out")
    [ "$code" = "200" ] && break
    n=$((n+1))
    sleep 2
  done
  if [ "$code" = "200" ]; then
    echo "UPDATE RESPONSE WAS AMBIGUOUS but the new password IS active."
    recovery_note
    exit 1
  fi
  # last check: is the OLD password still working? If yes, the change truly
  # never applied and we stay fully unchanged (safe to discard recovery).
  code=$(req POST /auth/user/emailpass "$TMP/oldlogin.json" "$TMP/none" "$TMP/old.out" || true)
  if [ "$code" = "200" ]; then
    printf 'FAIL: update returned %s; old password still active — change did not apply at all\n' "$code" >&2
    rm -f "$RECOVERY_FILE"
    unset NEW_PW
    exit 1
  fi
  # Old password not working and new password not working yet: state unknown.
  printf 'FAIL: update outcome is UNKNOWN (new=%s old=%s); old password is NOT valid\n' "$code" "$code" >&2
  sleep 5
  code=$(req POST /auth/user/emailpass "$TMP/probe.json" "$TMP/none" "$TMP/probe.out")
  if [ "$code" = "200" ]; then
    echo "The new password became active after retry."
    recovery_note
    exit 1
  fi
  echo "Neither password authenticates. Do NOT retry the old one; inspect backend logs."
  recovery_note
  exit 1
fi

# --- step 5: verify NEW password works (3 attempts, transient-safe) ------------
printf '{"email": %s, "password": %s}\n' "$(jqstr "$staging_email")" "$(jqstr "$NEW_PW")" > "$TMP/newlogin.json"
chmod 600 "$TMP/newlogin.json"
code=""
n=0
while [ "$n" -lt 3 ]; do
  code=$(req POST /auth/user/emailpass "$TMP/newlogin.json" "$TMP/none" "$TMP/new.out")
  [ "$code" = "200" ] && break
  n=$((n+1))
  sleep 2
done
if [ "$code" = "200" ]; then
  echo "PASS step 5/6 new password authenticates"
else
  printf 'FAIL: login with NEW password returned %s after retries\n' "$code" >&2
  echo "The password WAS changed; the password itself is NOT lost:"
  recovery_note
  exit 1
fi
rm -f "$TMP/newlogin.json"

# --- step 6: verify OLD password is now invalid --------------------------------
code=$(req POST /auth/user/emailpass "$TMP/oldlogin.json" "$TMP/none" "$TMP/old.out")
if [ "$code" = "401" ]; then
  echo "PASS step 6/6 old password rejected with 401"
else
  printf 'FAIL: old password returned %s (expected 401) — investigation required\n' "$code" >&2
  echo "If 200: the change did NOT invalidate the old credential yet; do NOT trust the old password."
  recovery_note
  exit 1
fi

# --- finally: rotate the protected seed env file --------------------------------
{
  printf 'STAGING_ADMIN_EMAIL=%s\n' "$staging_email"
  printf 'STAGING_ADMIN_PASSWORD=%s\n' "$NEW_PW"
} > "$TMP/seed.new"
chmod 600 "$TMP/seed.new"
mv "$TMP/seed.new" "$SEED_FILE"
chmod 600 "$SEED_FILE"
unset NEW_PW old_pw
# completed: the recovery file is no longer needed
rm -f "$RECOVERY_FILE"
. "$SEED_FILE"
[ -n "${STAGING_ADMIN_EMAIL:-}" ] && [ -n "${STAGING_ADMIN_PASSWORD:-}" ] \
  && echo "ROTATION COMPLETE: $SEED_FILE updated (mode $(stat -c '%a' "$SEED_FILE")), recovery file removed" \
  || { printf 'FAIL: seed env did not reload\n' >&2; exit 1; }
