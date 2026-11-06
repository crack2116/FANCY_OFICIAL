#!/bin/sh
# Read-only: inventory of the private env files on the server.
# Prints names, modes and structural shapes only; never any value.
set -u
for f in /home/ivan/fancyperu-dokploy.env /home/ivan/fancyperu-seed.env /home/ivan/fancyperu-dokploy-token /home/ivan/fancyperu-dokploy-compose-id; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    keycount=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "$f" 2>/dev/null || echo 0)
    if [ "$keycount" -gt 0 ] && [ "$f" != "/home/ivan/fancyperu-dokploy-compose-id" ] && [ "$f" != "/home/ivan/fancyperu-dokploy-token" ]; then
      keys=$(grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$f" | cut -d= -f1 | tr '\n' ' ')
    else
      keys="-"
    fi
    printf 'PRESENT %-45s mode=%s bytes=%s keys=%s\n' "$f" "$(stat -c '%a' "$f")" "$(wc -c < "$f")" "$keys"
  else
    printf 'ABSENT  %s\n' "$f"
  fi
done
# home dir listing to spot leftovers with other names
ls -la /home/ivan/ | grep -i fancyperu || true
