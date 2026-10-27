#!/usr/bin/env bash
# Monthly check that the newest backup actually restores: downloads it, loads it
# into a throwaway Postgres container, and prints row counts. Nothing touches the
# live database. Run as root: /home/ubuntu/mismo/deploy/restore-test.sh
set -euo pipefail

cd "$(dirname "$0")/.."
REMOTE="${MISMO_BACKUP_REMOTE:-mismo-crypt:}"
WORK="$(mktemp -d)"
NAME="mismo-restore-test-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

LATEST="$(rclone lsf "${REMOTE}db/" | sort | tail -n 1)"
if [ -z "$LATEST" ]; then
  echo "No backups found at ${REMOTE}db/"
  exit 1
fi
echo "Testing $LATEST"
rclone copyto "${REMOTE}db/$LATEST" "$WORK/latest.dump"

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test -v "$WORK":/backup:ro postgres:17-alpine >/dev/null
# The image starts Postgres twice (setup, then for real); wait for the second start.
for _ in $(seq 1 60); do
  if [ "$(docker logs "$NAME" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; then break; fi
  sleep 1
done

docker exec "$NAME" createdb -U postgres mismo
docker exec "$NAME" pg_restore -U postgres -d mismo --no-owner /backup/latest.dump
docker exec "$NAME" psql -U postgres -d mismo -Atc "
  select 'areas', count(*) from area
  union all select 'findings', count(*) from finding
  union all select 'projects', count(*) from project
  union all select 'maintenance jobs', count(*) from maintenance_plan
  union all select 'files', count(*) from file"
echo "Restore test passed: $LATEST"
