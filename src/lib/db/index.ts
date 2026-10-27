import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

type Conn = { db: DB; kind: "pg" | "pglite" };

// One connection per process. Kept on globalThis so dev reloads and the
// instrumentation bundle share it (PGlite allows only one open instance).
const g = globalThis as typeof globalThis & { __mismoConn?: Conn; __mismoMigrated?: Promise<void> };

function connect(): Conn {
  // Production sets DATABASE_URL to Postgres. Without it, development uses an
  // embedded Postgres (PGlite) stored on disk, so no database install is needed.
  const url = process.env.DATABASE_URL || "pglite:./.data/pglite";
  if (url.startsWith("pglite:")) {
    const dir = path.resolve(url.slice("pglite:".length));
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const client = new PGlite(dir);
    // Same query builder as node-postgres; only the driver underneath differs.
    return { db: drizzlePglite({ client, schema }) as unknown as DB, kind: "pglite" };
  }
  const pool = new Pool({ connectionString: url, max: 5 });
  return { db: drizzlePg({ client: pool, schema }), kind: "pg" };
}

function conn(): Conn {
  return (g.__mismoConn ??= connect());
}

// Connects on first use rather than at import, so `next build` never opens a database.
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = conn().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Applies pending migrations from ./drizzle, once per process. */
export function ensureMigrated(): Promise<void> {
  g.__mismoMigrated ??= (async () => {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    const c = conn();
    if (c.kind === "pglite") {
      await migratePglite(c.db as never, { migrationsFolder });
    } else {
      await migratePg(c.db, { migrationsFolder });
    }
  })();
  return g.__mismoMigrated;
}
