#!/bin/sh
# Read-only validation of /home/ivan/fancyperu-seed.env.
# Prints PASS/FAIL diagnostics only; NEVER prints the values themselves.
set -u
F=${1:-/home/ivan/fancyperu-seed.env}
fail=0
[ -f "$F" ] || { echo "FAIL file missing: $F"; exit 1; }
ok() { echo "PASS $1"; }
bad() { echo "FAIL $1"; fail=1; }

keycount=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "$F")
[ "$keycount" = "2" ] || bad "expected exactly 2 keys, found $keycount"

EMAIL=$(grep -E '^STAGING_ADMIN_EMAIL=' "$F" | head -n1 | cut -d= -f2)
PW=$(grep -E '^STAGING_ADMIN_PASSWORD=' "$F" | head -n1 | cut -d= -f2)

case "$EMAIL" in
  ''|*[[:space:]]*) bad "STAGING_ADMIN_EMAIL empty or contains whitespace" ;;
  *)
    case "$EMAIL" in
      *[!@A-Za-z0-9._%+-]*) bad "STAGING_ADMIN_EMAIL has unexpected characters" ;;
      *@*.*)
        case "$EMAIL" in
          *@*.*@*) bad "email has multiple @ signs" ;;
          *) ok "email shape valid (domain: ${EMAIL#*@})" ;;
        esac ;;
      *) bad "email shape invalid" ;;
    esac
    len=${#EMAIL}
    [ "$len" -gt 3 ] || bad "email too short"
    ;;
esac

case "$PW" in
  ''|*[[:space:]]*) bad "STAGING_ADMIN_PASSWORD empty or contains whitespace" ;;
  *)
    plen=${#PW}
    if [ "$plen" -ge 16 ]; then ok "password length $plen (>=16)"; else bad "password too short ($plen)"; fi
    case "$PW" in
      *[!A-Za-z0-9]*) bad "password contains non-alphanumeric characters (harder to source)";
                      ;;
      *) ok "password is simple alphanumeric (safe to source)" ;;
    esac
    ;;
esac

# sourcing sanity: source it in a subshell and confirm both variables exist
( . "$F" 2>/dev/null || true; \
  [ -n "${STAGING_ADMIN_EMAIL:-}" ] && [ -n "${STAGING_ADMIN_PASSWORD:-}" ] ) \
  && ok "file sources cleanly with both variables set" || bad "file did not source cleanly"

[ "$fail" = "0" ] && echo "SEED ENV OK" || echo "SEED ENV PROBLEMS"
exit "$fail"
