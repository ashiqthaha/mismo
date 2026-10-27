import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "./db/schema";

export type AppUser = { id: string; name: string; email: string; role: Role };

export async function getUser(): Promise<AppUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const { id, name, email, role } = s.user as typeof s.user & { role?: string };
  return { id, name, email, role: role === "owner" ? "owner" : "family" };
}

/** The signed-in user, or a redirect to the sign-in page. Call it first in every page and action. */
export async function requireUser(): Promise<AppUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireOwner(): Promise<AppUser> {
  const u = await requireUser();
  if (u.role !== "owner") redirect("/");
  return u;
}
