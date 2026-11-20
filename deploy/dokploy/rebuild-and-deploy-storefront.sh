#!/bin/sh
set -eu

echo "== 1. Building fancyperu-storefront:dokploy =="
sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh storefront

echo "== 2. Triggering Dokploy redeploy =="
TOKEN=$(tr -d '\r\n' < /home/ivan/fancyperu-dokploy-token)
CID=$(tr -d '\r\n' < /home/ivan/fancyperu-dokploy-compose-id)
curl -fsS -X POST -H 'Content-Type: application/json' -H "x-api-key: $TOKEN" \
  -d "{\"composeId\":\"$CID\",\"title\":\"Deploy updated secondary banner on storefront\"}" \
  "http://127.0.0.1:3000/api/compose.deploy"
echo ""

echo "== 3. Waiting for deployment and checking http://shop.192.168.1.38.nip.io/pe =="
i=0
while [ "$i" -lt 24 ]; do
  sleep 5
  i=$((i + 1))
  if curl -fsS -H 'Host: shop.192.168.1.38.nip.io' http://127.0.0.1/pe 2>/dev/null | grep -q "Baño, cepillado y paseo"; then
    echo "OK: New banner is LIVE at http://shop.192.168.1.38.nip.io/pe"
    exit 0
  fi
done
echo "WARN: Timed out waiting for new banner text; check Dokploy logs."
exit 1
