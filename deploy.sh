#!/usr/bin/env bash
# Deploy script for the Bahawalpur Tech / CareerBridge AI VPS.
#
# Usage (on the Contabo VPS, from the repo directory):
#   bash deploy.sh
#
# What it does, in order:
#   1. Verifies you're on the main branch with a clean working tree.
#   2. Pulls the latest main from origin.
#   3. Takes a timestamped pg_dump of the careerbridge database (rolling, last 7 kept).
#   4. Rebuilds the api + web Docker images and recreates containers.
#      (alembic upgrade head runs automatically inside the api container on startup.)
#   5. Waits briefly, then prints `docker compose ps` and the last 30 lines of api/web logs.
#
# Safe to re-run. Aborts on any error (set -e). Requires: git, docker, docker compose plugin.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

BACKUP_DIR="${REPO_DIR}/.db-backups"
KEEP_BACKUPS=7
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. Pre-flight checks -------------------------------------------------
log "Pre-flight: checking git state"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  fail "Not on main (current: $BRANCH). Run 'git checkout main' first."
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Working tree has uncommitted changes. Commit, stash, or discard before deploying."
fi

# --- 2. Pull latest main --------------------------------------------------
log "Fetching origin"
git fetch origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [[ "$LOCAL" == "$REMOTE" ]]; then
  log "Already at origin/main ($LOCAL). Continuing — will still rebuild."
else
  log "Pulling: $LOCAL -> $REMOTE"
  git pull --ff-only origin main
fi

# --- 3. DB backup ---------------------------------------------------------
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/careerbridge-${TIMESTAMP}.sql.gz"
if docker compose ps db 2>/dev/null | grep -q "Up"; then
  log "Backing up database -> $BACKUP_FILE"
  docker compose exec -T db pg_dump -U careerbridge careerbridge | gzip > "$BACKUP_FILE"
  log "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
  # Prune old backups, keep newest $KEEP_BACKUPS
  ls -1t "$BACKUP_DIR"/careerbridge-*.sql.gz 2>/dev/null \
    | tail -n +$((KEEP_BACKUPS + 1)) \
    | xargs -r rm -f
else
  warn "DB container not running yet — skipping backup (first deploy?)"
fi

# --- 4. Build + restart services -----------------------------------------
log "Rebuilding and restarting containers (this can take a few minutes)"
docker compose up --build -d --remove-orphans

# --- 5. Health check ------------------------------------------------------
log "Waiting 10s for services to settle"
sleep 10

log "Container status:"
docker compose ps

log "Recent api logs (last 30 lines):"
docker compose logs --tail=30 api || true

log "Recent web logs (last 30 lines):"
docker compose logs --tail=30 web || true

log "Done. Verify https://bahawalpur.tech is responding and try a /forgot-password flow."
