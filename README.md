# Mismo

A small web app for running the upkeep and renovation of one house: walk it room by room, log what needs doing, group findings into projects, and get reminders for recurring maintenance.

- **House profile:** areas and systems (furnace, water heater, roof…), each with age, warranty and service history.
- **Walkthrough:** phone-first capture of findings with photos and a severity.
- **Projects:** tasks, budget vs. spending, before/during/after photos, and a log.
- **Upkeep:** a starter maintenance checklist timed for Maryland weather, with email and phone reminders.
- **Invite-only:** sign in by email link or Google; the owner invites family.

Built with Next.js 16, PostgreSQL (Drizzle), Better Auth, Resend and Web Push.

## Development

Needs Node.js 24. No database install: without `DATABASE_URL`, the app uses an embedded Postgres (PGlite) stored in `.data/`.

```bash
cp .env.example .env.local   # set BETTER_AUTH_URL=http://localhost:3000, a BETTER_AUTH_SECRET and OWNER_EMAIL
npm install
npm run dev
```

On first start the app creates its tables and loads the starter areas, systems and maintenance jobs. Without `RESEND_API_KEY`, sign-in links print in the terminal.

House details (address, size, year built) are read once from `data/home.local.json` if present. That file is git-ignored and never belongs in this public repo.

After changing `src/lib/db/schema.ts`, create a migration with `npx drizzle-kit generate`. Migrations run automatically when the app starts.

## Deploying

See [deploy/README.md](deploy/README.md).
