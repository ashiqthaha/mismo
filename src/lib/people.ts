import { asc } from "drizzle-orm";
import { db } from "./db";
import { user } from "./db/schema";

export type Person = { id: string; name: string; email: string; role: string };

export async function listPeople(): Promise<Person[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .orderBy(asc(user.name));
}

/** A friendly name: the person's name, or the part of their email before the @. */
export function displayName(p: { name?: string | null; email?: string | null } | null | undefined): string {
  if (!p) return "Unknown";
  return p.name?.trim() || p.email?.split("@")[0] || "Unknown";
}
