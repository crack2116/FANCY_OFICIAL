#!/bin/sh
# ==============================================================================
# FANCYPERU - build images on the target host using the private env file.
# Run with sudo (the Docker socket requires it for user ivan). The env file is
# read as root and is never printed. Builds are sequential.
#
# Usage:
#   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh
#   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh storefront
#
# The env file defaults to /home/ivan/fancyperu-dokploy.env and must contain
# the variables from config/dokploy.env.example. Keep it chmod 600 and outside
# the source tree.
# ==============================================================================
set -eu

ENV_FILE=${ENV_FILE:-/home/ivan/fancyperu-dokploy.env}
SRC=${SRC:-/home/ivan/fancyperu-src}
TARGET=${1:-all}

[ -f "$ENV_FILE" ] || { echo "build-from-env: missing $ENV_FILE" >&2; exit 1; }
[ -d "$SRC" ] || { echo "build-from-env: missing $SRC" >&2; exit 1; }

set -a
. "$ENV_FILE"
set +a

# The real publishable key is stored in a protected file after the seed; when
# it exists it overrides the bootstrap key for the storefront build. The value
# is never printed or logged.
KEY_FILE=${KEY_FILE:-/home/ivan/fancyperu-publishable-key}
if [ -s "$KEY_FILE" ]; then
  export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$(tr -d '[:space:]' < "$KEY_FILE")
  echo "build-from-env: publishable key taken from $KEY_FILE (value not printed)"
else
  echo "build-from-env: publishable key kept as in $ENV_FILE (bootstrap value)"
fi

export SRC TARGET
exec sh "$SRC/deploy/dokploy/build-images.sh"
