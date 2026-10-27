import { db } from "./db";
import { auditLog } from "./db/schema";

/** Records who changed what. Every server action that writes data calls this. */
export async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLog).values({ userId, action, entity, entityId: entityId ?? null, detail: detail ?? null });
}
