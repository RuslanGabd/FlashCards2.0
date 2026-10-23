#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root"
if [ ! -f .env ]; then echo 'Run python3 scripts/init-env.py first.' >&2; exit 1; fi
set -a
source .env
set +a
: "${JWT_SECRET:?Set JWT_SECRET in .env}"
: "${DB_PASSWORD:?Set DB_PASSWORD in .env}"
java_bin="${JAVA_HOME:+$JAVA_HOME/bin/}java"
exec "$java_bin" -jar target/flash-0.0.1-SNAPSHOT.jar "$@"
