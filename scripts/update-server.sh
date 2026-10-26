#!/usr/bin/env bash
# Run on the VPS from the checkout: back up pb_data, pull the latest release, rebuild and check it is live.
#   scripts/update-server.sh
# Environment: PORT (default 8090), KEEP_BACKUPS (default 14).
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-8090}"
KEEP_BACKUPS="${KEEP_BACKUPS:-14}"
BACKUP_DIR="../word-garden-backups"
SERVICE="word-garden"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "The server checkout has local changes. Resolve them (git status), then re-run." >&2
  exit 1
fi

previous="$(git rev-parse HEAD)"
previous_version="$(sed -n 's/.*APP_VERSION = "\([^"]*\)".*/\1/p' pb_public/js/version.js)"

echo "Fetching..."
git fetch --tags origin
git merge --ff-only '@{u}'
new="$(git rev-parse HEAD)"
new_version="$(sed -n 's/.*APP_VERSION = "\([^"]*\)".*/\1/p' pb_public/js/version.js)"
echo "Code: v$previous_version ($(git rev-parse --short "$previous")) -> v$new_version ($(git rev-parse --short "$new"))"

backed_up=""
rollback_hint() {
  echo >&2
  if [ -n "$backed_up" ]; then
    echo "Update failed after the data backup (in $BACKUP_DIR)." >&2
  else
    echo "Update failed before anything was stopped; the running site is unchanged." >&2
  fi
  echo "To go back to the previous code: git reset --hard $previous && docker compose up -d --build" >&2
}
trap rollback_hint ERR

echo "Building image (the running site stays up)..."
docker compose build

echo "Backing up pb_data..."
mkdir -p "$BACKUP_DIR"
docker compose stop "$SERVICE"
tar -czf "$BACKUP_DIR/pb-data-$(date +%Y%m%d-%H%M%S).tgz" pb_data
backed_up=1
ls -1t "$BACKUP_DIR"/pb-data-*.tgz | tail -n +"$((KEEP_BACKUPS + 1))" | while IFS= read -r old; do rm -- "$old"; done

echo "Starting..."
docker compose up -d "$SERVICE"

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    live="$(curl -fsS "http://127.0.0.1:$PORT/js/version.js" | sed -n 's/.*APP_VERSION = "\([^"]*\)".*/\1/p')"
    if [ "$live" != "$new_version" ]; then
      echo "Health check passed but the site serves v$live, expected v$new_version." >&2
      exit 1
    fi
    trap - ERR
    echo "Word Garden v$live is live."
    exit 0
  fi
  sleep 1
done

echo "The site did not become healthy within 30 seconds. Logs: docker compose logs --tail 100 $SERVICE" >&2
exit 1
