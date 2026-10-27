"use server";

import { refresh } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { logEntry, type OwnerType } from "@/lib/db/schema";
import { deleteFile, OWNER_TYPES } from "@/lib/files";
import { str } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function addLogEntry(ownerType: OwnerType, ownerId: string, formData: FormData) {
  const me = await requireUser();
  const body = str(formData.get("body"));
  if (!body || !OWNER_TYPES.includes(ownerType)) return;
  const [row] = await db.insert(logEntry).values({ ownerType, ownerId, body, createdBy: me.id }).returning({ id: logEntry.id });
  await audit(me.id, "create", "log_entry", row.id, { ownerType, ownerId });
  refresh();
}

export async function removeFile(fileId: string) {
  const me = await requireUser();
  await deleteFile(fileId);
  await audit(me.id, "delete", "file", fileId);
  refresh();
}
