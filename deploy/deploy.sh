#!/usr/bin/env bash
# Build the images on THIS computer, copy them to the server, and (re)start the stack there.
# The 1 GB server is too small to build Java/Next.js itself.
#
# Usage (from the repo root, on your laptop):
#   bash deploy/deploy.sh ubuntu@<SERVER_IP> ~/path/to/ssh-key.key
set -euo pipefail

cd "$(dirname "$0")/.."

SERVER="${1:?Usage: bash deploy/deploy.sh ubuntu@<SERVER_IP> <ssh-key-file>}"
KEY="${2:?Usage: bash deploy/deploy.sh ubuntu@<SERVER_IP> <ssh-key-file>}"
ENV_FILE="deploy/.env.production"
REMOTE_DIR="easyrenting"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE. Create it: cp deploy/.env.production.example $ENV_FILE" >&2; exit 1; }

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$SERVER")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)
COMPOSE_FILES=(-f docker-compose.yml -f deploy/docker-compose.prod.yml)

echo "==> Building images locally"
docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" build backend frontend

echo "==> Copying config to the server"
"${SSH[@]}" "mkdir -p $REMOTE_DIR/deploy"
"${SCP[@]}" docker-compose.yml "$SERVER:$REMOTE_DIR/"
"${SCP[@]}" deploy/docker-compose.prod.yml deploy/Caddyfile deploy/reset-demo.sh "$SERVER:$REMOTE_DIR/deploy/"
"${SCP[@]}" "$ENV_FILE" "$SERVER:$REMOTE_DIR/.env"

echo "==> Uploading images (a few hundred MB, takes a few minutes)"
docker save easyrenting-backend:latest easyrenting-frontend:latest | gzip | "${SSH[@]}" "gunzip | docker load"

echo "==> Starting the stack on the server"
"${SSH[@]}" "cd $REMOTE_DIR && docker compose ${COMPOSE_FILES[*]} up -d --no-build --remove-orphans && docker image prune -f >/dev/null && docker compose ${COMPOSE_FILES[*]} ps"

echo
echo "Done. Live at: https://$(grep -E '^SITE_HOST=' "$ENV_FILE" | cut -d= -f2)"
echo "The backend needs 2-4 minutes to start on this small server before logins work."
