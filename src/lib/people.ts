import { asc } from "drizzle-orm";
import { db } from "./db";
import { user, type Bird } from "./db/schema";

export type Person = { id: string; name: string; email: string; role: string; bird: Bird | null };

export async function listPeople(): Promise<Person[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, bird: user.bird })
    .from(user)
    .orderBy(asc(user.name));
}

/** A friendly name: the person's name, or the part of their email before the @. */
export function displayName(p: { name?: string | null; email?: string | null } | null | undefined): string {
  if (!p) return "Unknown";
  return p.name?.trim() || p.email?.split("@")[0] || "Unknown";
}
