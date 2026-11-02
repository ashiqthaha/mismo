#!/usr/bin/env bash
# Prints a one-time sign-in link: for the owner's first sign-in on a new install, or when
# nobody can sign in to send one from Settings (every owner has lost their passkeys).
# Run it on the server, in the mismo folder:
#
#   deploy/signin-link.sh name@example.com
#
# The address must be the owner's, a member's or an invited one. Open the link on the
# device to sign in, tap Sign in, then add a passkey. It works once and lasts 1 hour.
#
# It writes the same record Better Auth's magic-link plugin (1.7) writes: identifier
# "magic-link:<token>" and value {"type":"magic-link","email":...}. Check this still
# holds after upgrading better-auth.
set -euo pipefail
cd "$(dirname "$0")/.."

email=$(printf '%s' "${1:?Usage: deploy/signin-link.sh EMAIL}" | tr '[:upper:]' '[:lower:]')
base=$(sed -n 's/^BETTER_AUTH_URL=//p' .env | tail -n 1 | tr -d "\"'")
token=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')

if docker info >/dev/null 2>&1; then compose=(docker compose); else compose=(sudo docker compose); fi
"${compose[@]}" exec -T db psql -U mismo -d mismo -v ON_ERROR_STOP=1 -q -v email="$email" -v token="$token" <<'SQL'
insert into verification (id, identifier, value, expires_at)
values (gen_random_uuid()::text, 'magic-link:' || :'token', json_build_object('type', 'magic-link', 'email', :'email')::text, now() + interval '1 hour');
SQL

echo "${base%/}/login/confirm?token=$token"
