#!/bin/sh
# ==============================================================================
# FANCYPERU - functional test of the redeployed storefront + Medusa store API.
# Runs as ivan on the host (no sudo): everything goes through Traefik on
# localhost:80 with Host headers, using the real publishable token from the
# protected file. The token is never printed. READ-ONLY except the demo
# cart/line-item it creates in the TEST database (no order, no payment).
# ==============================================================================
set -u
KEY_FILE=${KEY_FILE:-/home/ivan/fancyperu-publishable-key}
ENV_FILE=${ENV_FILE:-/home/ivan/fancyperu-dokploy.env}
FAIL=0
ok() { printf 'OK   %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }

[ -s "$KEY_FILE" ] || { echo "ERROR: $KEY_FILE missing (run extract-publishable-key.sh first)" >&2; exit 1; }
API_DOMAIN=$(grep -oE '^API_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)
STOREFRONT_DOMAIN=$(grep -oE '^STOREFRONT_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)
S3_DOMAIN=$(grep -oE '^S3_DOMAIN=.*' "$ENV_FILE" | head -n1 | cut -d= -f2)

H=$(mktemp)
B=$(mktemp)
trap 'rm -f "$H" "$B"' EXIT
chmod 600 "$H" "$B"
printf 'x-publishable-api-key: %s\n' "$(tr -d '[:space:]' < "$KEY_FILE")" > "$H"

jget() { # json-string-file jqexpr -> value (empty on error)
  jq -r "$2" "$1" 2>/dev/null || echo ""
}
code() { # host path [+key] -> http code on stdout; body in $B
  if [ "${3:-}" = "key" ]; then
    curl -sS -m 20 -o "$B" -w '%{http_code}' --header @"$H" -H "Host: $1" "http://127.0.0.1$2" 2>/dev/null
  else
    curl -sS -m 20 -o "$B" -w '%{http_code}' -H "Host: $1" "http://127.0.0.1$2" 2>/dev/null
  fi
}

echo "== store API through Traefik (api host) =="
c=$(code "$API_DOMAIN" /store/products?limit=5 key)
if [ "$c" = "200" ]; then
  n=$(jget "$B" '.count // 0')
  handle=$(jget "$B" '.products[0].handle // ""')
  ok "GET /store/products -> 200 (count=$n)"
  [ -n "$handle" ] || bad "no product handle in response"
else
  echo "body:" && head -c 300 "$B"
  bad "GET /store/products -> $c"
fi

c=$(code "$API_DOMAIN" /store/product-categories?limit=10 key)
if [ "$c" = "200" ]; then
  n=$(jget "$B" '.count // 0')
  cat1=$(jget "$B" '.product_categories[0].handle // ""')
  ok "GET /store/product-categories -> 200 (count=$n, first=$cat1)"
else
  bad "GET /store/product-categories -> $c"
fi

c=$(code "$API_DOMAIN" "/store/products?q=perro&limit=5" key)
if [ "$c" = "200" ]; then
  n=$(jget "$B" '.count // 0')
  ok "search perro -> 200 (results=$n)"
else
  bad "search -> $c"
fi

c=$(code "$API_DOMAIN" /store/regions?limit=10 key)
REGION=$(jget "$B" '.regions[0].id // ""')
if [ "$c" = "200" ] && [ -n "$REGION" ]; then
  ok "regions -> 200 (region=$REGION)"
else
  bad "regions -> $c"
fi

echo "== demo cart lifecycle (test data only; no order, no payment) =="
if [ -n "$REGION" ]; then
  c=$(curl -sS -m 20 -o "$B" -w '%{http_code}' --header @"$H" -H "Host: $API_DOMAIN" \
    -H 'Content-Type: application/json' \
    --data "{\"region_id\":\"$REGION\"}" http://127.0.0.1/store/carts 2>/dev/null)
  CART=$(jget "$B" '.cart.id // ""')
  [ "$c" = "200" ] && [ -n "$CART" ] \
    && ok "cart created -> 200" \
    || { echo "body:"; head -c 300 "$B"; bad "cart create -> $c"; }

  if [ -n "$CART" ]; then
    # fetch one variant of the first product
    c=$(code "$API_DOMAIN" "/store/products?limit=1&fields=variants.id" key)
    VARIANT=$(jget "$B" '.products[0].variants[0].id // ""')
    if [ -n "$VARIANT" ]; then
      c=$(curl -sS -m 20 -o "$B" -w '%{http_code}' --header @"$H" -H "Host: $API_DOMAIN" \
        -H 'Content-Type: application/json' \
        --data "{\"variant_id\":\"$VARIANT\",\"quantity\":1}" \
        "http://127.0.0.1/store/carts/$CART/line-items" 2>/dev/null)
      it=$(jget "$B" '.cart.items[0].title // ""')
      [ "$c" = "200" ] && [ -n "$it" ] \
        && ok "line item added (title=$it)" \
        || { echo "body:"; head -c 300 "$B"; bad "line-items add -> $c"; }

      c=$(curl -sS -m 20 -o "$B" -w '%{http_code}' --header @"$H" -H "Host: $API_DOMAIN" \
        "http://127.0.0.1/store/shipping-options?cart_id=$CART" 2>/dev/null)
      if [ "$c" = "200" ]; then
        n=$(jget "$B" '.shipping_options | length')
        ok "shipping-options -> 200 (options=$n)"
        jq -r '.shipping_options[]? | "  - \(.name // "?") amount=\(.amount // .calculated_price.calculated_amount // "?")"' "$B" 2>/dev/null || true
        [ "$n" -gt 0 ] || echo "NOTE: 0 shipping options -> wire not ready for demo checkout"
      else
        echo "body:"; head -c 300 "$B"; bad "shipping-options -> $c"
      fi
      # payment providers read-only info
      c=$(curl -sS -m 20 -o "$B" -w '%{http_code}' --header @"$H" -H "Host: $API_DOMAIN" \
        "http://127.0.0.1/store/payment-providers?region_id=$REGION" 2>/dev/null)
      if [ "$c" = "200" ]; then
        jq -r '.payment_providers[]? | "payment provider: \(.id // "?")"' "$B" 2>/dev/null | sort -u
        ok "payment-providers -> 200"
      else
        bad "payment-providers -> $c"
      fi
    else
      bad "no variant found for first product"
    fi
  fi
fi

echo "== product image through Traefik (s3 host) =="
c=$(code "$API_DOMAIN" "/store/products?limit=1&fields=thumbnail" key)
THUMB=$(jget "$B" '.products[0].thumbnail // ""')
if [ -n "$THUMB" ]; then
  ic=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -L "$THUMB" 2>/dev/null)
  case "$ic" in
    200) ok "image fetch -> 200" ;;
    *) bad "image fetch -> $ic (host: $(printf %s "$THUMB" | cut -d/ -f3))" ;;
  esac
else
  echo "NOTE: no thumbnail on first product (images may not be seeded)"
fi

echo "== storefront pages through Traefik (shop host) =="
for path in / /pe; do
  c=$(curl -sS -m 25 -o /dev/null -L -w '%{http_code}' -H "Host: $STOREFRONT_DOMAIN" "http://127.0.0.1$path" 2>/dev/null)
  case "$c" in
    200) ok "GET $path -> 200 (final after redirects)" ;;
    *) bad "GET $path -> $c" ;;
  esac
done
if [ -n "${handle:-}" ]; then
  c=$(curl -sS -m 25 -o /dev/null -L -w '%{http_code}' -H "Host: $STOREFRONT_DOMAIN" "http://127.0.0.1/pe/products/$handle" 2>/dev/null)
  case "$c" in
    200) ok "product page /pe/products/$handle -> 200" ;;
    *) bad "product page -> $c" ;;
  esac
  c=$(curl -sS -m 25 -o /dev/null -L -w '%{http_code}' -H "Host: $STOREFRONT_DOMAIN" "http://127.0.0.1/pe/store?q=perro" 2>/dev/null)
  case "$c" in
    200) ok "search page /pe/store?q=perro -> 200" ;;
    *) bad "search page -> $c" ;;
  esac
fi

echo
[ "$FAIL" = "0" ] && echo "STORE TESTS PASSED" || echo "SOME STORE TESTS FAILED"
exit "$FAIL"
