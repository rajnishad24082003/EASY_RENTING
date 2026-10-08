#!/usr/bin/env bash
# Wipe the database and uploaded files, then restart, so the demo data is re-seeded from scratch.
# Useful because the demo accounts' password is public and visitors can change things.
# Keeps Caddy's certificate volume, so HTTPS isn't re-issued.
set -euo pipefail

cd "$(dirname "$0")/.."

compose() { docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml "$@"; }

compose stop backend postgres
compose rm -f backend postgres
docker volume rm easyrenting_pgdata easyrenting_uploads
compose up -d
echo "Demo data will be re-seeded when the backend finishes starting (about a minute)."
