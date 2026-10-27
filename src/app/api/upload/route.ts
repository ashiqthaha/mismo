import { audit } from "@/lib/audit";
import type { OwnerType } from "@/lib/db/schema";
import { OWNER_TYPES, saveUpload } from "@/lib/files";
import { getUser } from "@/lib/session";

const PHASES = ["before", "during", "after"] as const;

export async function POST(req: Request) {
  const me = await getUser();
  if (!me) return new Response("Sign in first", { status: 401 });

  const form = await req.formData();
  const ownerType = String(form.get("ownerType") ?? "") as OwnerType;
  const ownerId = String(form.get("ownerId") ?? "");
  const phaseRaw = String(form.get("phase") ?? "");
  const phase = (PHASES as readonly string[]).includes(phaseRaw) ? (phaseRaw as (typeof PHASES)[number]) : null;
  if (!OWNER_TYPES.includes(ownerType) || !ownerId) {
    return new Response("Missing what the files belong to", { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const ids: string[] = [];
  try {
    for (const f of files) {
      ids.push(await saveUpload(f, { type: ownerType, id: ownerId }, { phase, userId: me.id }));
    }
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Upload failed", { status: 400 });
  }
  if (ids.length) await audit(me.id, "upload", ownerType, ownerId, { files: ids.length });
  return Response.json({ ids });
}
