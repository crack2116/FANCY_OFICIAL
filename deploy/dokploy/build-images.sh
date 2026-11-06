#!/bin/sh
# ==============================================================================
# FANCYPERU - build the backend and storefront images on the target host.
# Run with sudo (the Docker daemon socket requires it for user ivan).
#
# The source tree must already be present (rsync/tar transfer), for example:
#   /home/ivan/fancyperu-src
#
# Usage:
#   sudo SRC=/home/ivan/fancyperu-src API_DOMAIN=api.fancyperu.invalid \
#     STOREFRONT_DOMAIN=shop.fancyperu.invalid \
#     NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_bootstrap \
#     sh ./build-images.sh
#
#   # after the staging seed created the real publishable key:
#   sudo TARGET=storefront SRC=/home/ivan/fancyperu-src \
#     API_DOMAIN=api.fancyperu.invalid \
#     STOREFRONT_DOMAIN=shop.fancyperu.invalid \
#     NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<real-token> sh ./build-images.sh
#
# Builds are sequential on purpose: the host has ~7 GiB RAM.
# ==============================================================================
set -eu

SRC=${SRC:-/home/ivan/fancyperu-src}
TARGET=${TARGET:-all}
API_DOMAIN=${API_DOMAIN:?set API_DOMAIN (for example api.fancyperu.invalid)}
STOREFRONT_DOMAIN=${STOREFRONT_DOMAIN:-shop.fancyperu.invalid}
PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-pk_bootstrap}
PUBLIC_SCHEME=${PUBLIC_SCHEME:-https}
DEFAULT_REGION=${NEXT_PUBLIC_DEFAULT_REGION:-pe}
ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT:-production}
CULQI_PUBLIC_KEY=${NEXT_PUBLIC_CULQI_PUBLIC_KEY:-}
YAPE_PHONE=${NEXT_PUBLIC_YAPE_PHONE:-}
PLIN_PHONE=${NEXT_PUBLIC_PLIN_PHONE:-}
BANK_ACCOUNTS=${NEXT_PUBLIC_BANK_ACCOUNTS:-}

fail() { echo "build-images: $*" >&2; exit 1; }

[ -d "$SRC" ] || fail "source directory not found: $SRC"
[ -f "$SRC/apps/backend/Dockerfile" ] || fail "backend Dockerfile missing in $SRC"
[ -f "$SRC/apps/storefront/Dockerfile" ] || fail "storefront Dockerfile missing in $SRC"
[ -f "$SRC/pnpm-lock.yaml" ] || fail "pnpm-lock.yaml missing in $SRC"

cd "$SRC"

echo "build-images: source=$SRC target=$TARGET"
echo "build-images: host memory before build"
free -h

case "$TARGET" in
  all|backend)
    echo "build-images: building fancyperu-backend:dokploy"
    docker build -f apps/backend/Dockerfile -t fancyperu-backend:dokploy .
    ;;
esac

case "$TARGET" in
  all|storefront)
    echo "build-images: building fancyperu-storefront:dokploy"
    docker build \
      -f apps/storefront/Dockerfile \
      --build-arg "NEXT_PUBLIC_MEDUSA_BACKEND_URL=${PUBLIC_SCHEME}://${API_DOMAIN}" \
      --build-arg "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}" \
      --build-arg "NEXT_PUBLIC_BASE_URL=${PUBLIC_SCHEME}://${STOREFRONT_DOMAIN}" \
      --build-arg "NEXT_PUBLIC_DEFAULT_REGION=${DEFAULT_REGION}" \
      --build-arg "NEXT_PUBLIC_ENVIRONMENT=${ENVIRONMENT}" \
      --build-arg "NEXT_PUBLIC_CULQI_PUBLIC_KEY=${CULQI_PUBLIC_KEY}" \
      --build-arg "NEXT_PUBLIC_YAPE_PHONE=${YAPE_PHONE}" \
      --build-arg "NEXT_PUBLIC_PLIN_PHONE=${PLIN_PHONE}" \
      --build-arg "NEXT_PUBLIC_BANK_ACCOUNTS=${BANK_ACCOUNTS}" \
      -t fancyperu-storefront:dokploy .
    ;;
esac

echo "build-images: images"
docker image inspect \
  -f '{{.RepoTags}} id={{.Id}} size={{.Size}}' \
  fancyperu-backend:dokploy fancyperu-storefront:dokploy 2>/dev/null || true

echo "build-images: host memory after build"
free -h
echo "build-images: done"
