#!/bin/bash
# Starts the accounts service with its secrets from server/data/oauth.env (git-ignored, mode 600).
cd "$(dirname "$0")/.."
set -a; [ -f server/data/oauth.env ] && . server/data/oauth.env; set +a
exec node --disable-warning=ExperimentalWarning server/index.mjs
