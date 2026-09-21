#!/bin/bash
# Starts the accounts service with its secrets from server/data/oauth.env (git-ignored, mode 600).
cd "$(dirname "$0")/.."
set -a; [ -f server/data/oauth.env ] && . server/data/oauth.env; set +a
node scripts/build-server-sim.mjs >/dev/null 2>&1 || echo "aviso: no se pudo construir server/gen/sim.mjs" >&2
exec node --disable-warning=ExperimentalWarning server/index.mjs
