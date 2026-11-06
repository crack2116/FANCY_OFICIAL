#!/bin/sh
# ==============================================================================
# FANCYPERU — read-only preflight before the first Dokploy Raw deploy.
# Requires sudo (Docker socket). Nothing is changed. Nothing is published.
# Usage: sudo sh /home/ivan/fancyperu-src/deploy/dokploy/preflight-stack.sh
# ==============================================================================
set -u

FAIL=0
say() { printf '\n=== %s ===\n' "$1"; }
ok() { printf 'OK   %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }

say "images for the Dokploy Docker engine (host daemon shared with Dokploy)"
for img in fancyperu-backend:dokploy fancyperu-storefront:dokploy; do
  line=$(docker image inspect -f '{{.RepoTags}} id={{.Id}} created={{.Created}} size={{.Size}} bytes' "$img" 2>/dev/null)
  if [ -n "$line" ]; then ok "image $line"; else bad "missing image $img"; fi
done

say "frontend plugin must see them via the socket"
label=$(docker image inspect -f \
  '{{index .Config.Labels "com.docker.compose.project"}}' \
  fancyperu-backend:dokploy 2>/dev/null)
[ -z "$label" ] && ok "no compose project label (labels-only check, informational)"

say "traefik entrypoints and redirects (file config; read-only)"
for f in /etc/dokploy/traefik/traefik.yml /etc/dokploy/traefik/dynamic/*.yml; do
  if [ -f "$f" ]; then
    echo "--- $f"
    grep -nE 'entryPoints|address|letsEncrypt|acme|redirection|websecure' "$f" | head -n 16
  fi
done

say "host ports 80/443 (who owns them now)"
ss -ltnp 2>/dev/null | grep -E ':(80|443)\s' || echo "none listening on 80/443"

say "private env file (names and shapes only; no values are printed)"
ENV_FILE=/home/ivan/fancyperu-dokploy.env
if [ ! -f "$ENV_FILE" ]; then
  bad "missing $ENV_FILE"
else
  keys=$(grep -cE '^[A-Z0-9_]+=' "$ENV_FILE")
  echo "keys=$keys (44 expected after the nip.io/LAN-HTTP switch)"
  [ "$keys" -ge 44 ] || bad "unexpected key count $keys"
  if grep -q '\.invalid' "$ENV_FILE"; then
    bad "env file still contains .invalid domains"
  else
    ok "no .invalid domains left"
  fi
  grep -q '^PUBLIC_SCHEME=http$' "$ENV_FILE" && ok "PUBLIC_SCHEME=http" || bad "PUBLIC_SCHEME missing"
  grep -q '^TRAEFIK_ENTRYPOINT=web$' "$ENV_FILE" && ok "TRAEFIK_ENTRYPOINT=web" || bad "TRAEFIK_ENTRYPOINT missing"
  grep -q '^TRAEFIK_TLS=false$' "$ENV_FILE" && ok "TRAEFIK_TLS=false" || bad "TRAEFIK_TLS missing"
  grep -q '^TRAEFIK_ENABLE=true$' "$ENV_FILE" && ok "TRAEFIK_ENABLE=true" || bad "TRAEFIK_ENABLE missing"
  grep -q '^TRAEFIK_CERTRESOLVER=$' "$ENV_FILE" && ok "TRAEFIK_CERTRESOLVER empty (no HTTP router as TLS)" || bad "TRAEFIK_CERTRESOLVER must be empty"
  for k in POSTGRES_PASSWORD REDIS_PASSWORD MINIO_ROOT_PASSWORD JWT_SECRET COOKIE_SECRET ORDER_TOKEN_SECRET; do
    grep -qE "^$k=[0-9a-f]{64}$" "$ENV_FILE" || bad "$k is not 64 hex"
  done
  for k in API_DOMAIN STOREFRONT_DOMAIN S3_DOMAIN; do
    grep -qE "^$k=.*\.nip\.io$" "$ENV_FILE" || bad "$k does not end in .nip.io"
  done
  mode=$(stat -c '%a' "$ENV_FILE")
  [ "$mode" = "600" ] && ok "env file mode 600" || bad "env file mode $mode"
fi

say "disk and memory headroom"
free -h | head -n 2
df -h / | tail -n 1

if [ "$FAIL" -eq 0 ]; then
  echo
  echo "PREFLIGHT OK — ready for the first Dokploy Raw deploy"
else
  echo
  echo "PREFLIGHT FAILED — fix the FAIL lines above"
fi
exit "$FAIL"
