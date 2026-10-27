#!/usr/bin/env bash
# Nightly backup for Mismo: a database dump plus any new photos and documents,
# encrypted and copied to Google Drive through the rclone remote "mismo-crypt:"
# (a crypt remote layered over a Google Drive remote that uses the drive.file
# scope, so rclone can only see files it created). Run from root's crontab:
#   15 2 * * * /home/ubuntu/mismo/deploy/backup.sh >> /var/log/mismo-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
REMOTE="${MISMO_BACKUP_REMOTE:-mismo-crypt:}"
KEEP_DAYS="${MISMO_BACKUP_KEEP_DAYS:-30}"
STAMP="$(date +%F)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[$(date -Is)] backup starting"

# 1. Database: one compressed dump per night; dumps older than KEEP_DAYS are removed.
docker compose exec -T db pg_dump -U mismo -d mismo --format=custom --compress=9 > "$WORK/mismo-$STAMP.dump"
rclone copyto "$WORK/mismo-$STAMP.dump" "${REMOTE}db/mismo-$STAMP.dump"
rclone delete "${REMOTE}db/" --min-age "${KEEP_DAYS}d"

# 2. Photos and documents: copies only what's new or changed. Files deleted in
#    the app stay in the backup.
UPLOADS="$(docker volume inspect -f '{{ .Mountpoint }}' mismo_uploads)"
rclone copy "$UPLOADS" "${REMOTE}uploads/"

# 3. Tell the app the backup worked. It alerts the owner if this goes stale.
mkdir -p state
touch state/last-backup

echo "[$(date -Is)] backup finished"
