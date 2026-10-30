# Deploying Mismo

Mismo runs as two Docker containers (the app and Postgres) on one Linux server, reachable only from the server itself on `127.0.0.1:3400`. A Cloudflare Tunnel publishes it on the internet, so no ports open on the server.

## 1. Get the code and settings onto the server

```bash
git clone https://github.com/ashiqthaha/mismo.git ~/mismo
cd ~/mismo
cp .env.example .env
chmod 600 .env
```

Fill in `.env`:

| Setting | Value |
| --- | --- |
| `BETTER_AUTH_URL` | The public address, e.g. `https://mismo.example.com` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `OWNER_EMAIL` | The owner's sign-in email |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `RESEND_API_KEY`, `EMAIL_FROM` | From Resend, after verifying the sending domain (e.g. a `mismo.` subdomain) |
| `EMAIL_REPLY_TO` | A real inbox for replies to reminders. Emails a person triggers reply to that person |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `docker run --rm node:24-slim npx -y web-push generate-vapid-keys` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `WEATHER_LAT`, `WEATHER_LON` | Optional. The house's latitude and longitude (two decimals is enough), so the sign-in scene shows the live weather there. Kept on the server; the page only gets the conditions |

Optional: put the house details in `config/home.json` (same fields as `data/home.local.json`). They load once, on the first start.

## 2. Build and start

```bash
docker compose up -d --build
docker compose logs -f app     # wait for "Ready"
curl -sI http://127.0.0.1:3400/login | head -1
```

The build briefly uses 1–2 GB of memory and both CPUs; run it when nothing busy is happening on the server.

## 3. Publish through Cloudflare

In the Cloudflare dashboard: Zero Trust → Networks → Tunnels → the server's tunnel → Public hostname → Add:

- Subdomain and domain: the address from `BETTER_AUTH_URL`
- Service: `HTTP` → `localhost:3400`

## 4. Email (Resend)

Add the domain in Resend and copy the DNS records it shows (DKIM, plus SPF/MX on a `send` subdomain) into Cloudflare DNS. Once Resend shows the domain as verified, set `RESEND_API_KEY` and `EMAIL_FROM`, then `docker compose up -d`.

## 5. Nightly backups to Google Drive

Install rclone (`sudo apt install rclone`, or from rclone.org for a newer version), then as root run `rclone config` and create:

1. A Google Drive remote named `mismo-gdrive` with **scope `drive.file`** (rclone can then see only the files it creates). If you use your own Google OAuth client, set its publishing status to **In production**; in Testing mode Google expires the sign-in after 7 days.
2. A **crypt** remote named `mismo-crypt` pointing at `mismo-gdrive:mismo-backup`. Save its passwords in your password manager: without them the backups can't be restored.

Test it, then schedule it:

```bash
sudo /home/ubuntu/mismo/deploy/backup.sh
sudo crontab -e
# add:
15 2 * * * /home/ubuntu/mismo/deploy/backup.sh >> /var/log/mismo-backup.log 2>&1
```

Each successful run touches `state/last-backup`. If that file is more than 30 hours old, Mismo alerts the owner.

Once a month, check the newest backup restores (it uses a throwaway container, never the live database):

```bash
sudo /home/ubuntu/mismo/deploy/restore-test.sh
```

## Updating

```bash
cd ~/mismo
git pull
docker compose up -d --build
```

Database migrations run automatically when the app starts.

## Restoring for real

```bash
rclone copyto mismo-crypt:db/mismo-YYYY-MM-DD.dump /tmp/restore.dump
docker compose stop app
docker compose exec -T db dropdb -U mismo mismo
docker compose exec -T db createdb -U mismo mismo
docker compose exec -T db pg_restore -U mismo -d mismo --no-owner < /tmp/restore.dump
UPLOADS="$(docker volume inspect -f '{{ .Mountpoint }}' mismo_uploads)"
rclone copy mismo-crypt:uploads/ "$UPLOADS"
chown -R 1001 "$UPLOADS"   # the app runs as uid 1001 and must be able to write there
docker compose start app
```
