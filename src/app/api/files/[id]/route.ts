import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { file } from "@/lib/db/schema";
import { storedPath } from "@/lib/files";
import { getUser } from "@/lib/session";

// Files are never public: each request checks the session first.
export async function GET(req: Request, ctx: RouteContext<"/api/files/[id]">) {
  const me = await getUser();
  if (!me) return new Response("Not found", { status: 404 });

  const { id } = await ctx.params;
  const [row] = await db.select().from(file).where(eq(file.id, id)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  const wantThumb = new URL(req.url).searchParams.has("thumb") && row.thumbKey;
  let data: Buffer;
  try {
    data = await fs.readFile(storedPath(wantThumb ? row.thumbKey! : row.storageKey));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const name = (row.originalName || "file").replace(/["\\\r\n]/g, "");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": wantThumb ? "image/jpeg" : row.mime,
      // Private: only this browser may cache it, and not for long (shared family devices).
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
