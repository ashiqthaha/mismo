import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "./db";
import { file, type OwnerType } from "./db/schema";

// Uploads live outside the app (a Docker volume in production), so keep the bundler from tracing this path.
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./.data/uploads");
export const OWNER_TYPES: OwnerType[] = ["home", "area", "system", "finding", "project", "maintenance_log"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type FileRow = typeof file.$inferSelect;

export function storedPath(key: string): string {
  const p = path.resolve(UPLOAD_DIR, key);
  if (!p.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Bad file key");
  return p;
}

/**
 * Stores one upload. Photos are turned upright, shrunk to at most 2,000 px,
 * saved as JPEG with a small thumbnail, and lose their metadata (including GPS
 * location). Anything else is stored as-is as a document.
 */
export async function saveUpload(
  f: File,
  owner: { type: OwnerType; id: string },
  opts: { phase?: "before" | "during" | "after" | null; userId: string },
): Promise<string> {
  if (f.size > MAX_UPLOAD_BYTES) throw new Error(`${f.name} is over 25 MB`);
  const id = crypto.randomUUID();
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  await fs.mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  const buf = Buffer.from(await f.arrayBuffer());
  const base = { id, ownerType: owner.type, ownerId: owner.id, phase: opts.phase ?? null, originalName: f.name, createdBy: opts.userId };

  if (f.type.startsWith("image/")) {
    try {
      const img = sharp(buf, { failOn: "none" }).rotate();
      const main = await img
        .clone()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      const thumb = await img
        .clone()
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 72 })
        .toBuffer();
      const storageKey = `${dir}/${id}.jpg`;
      const thumbKey = `${dir}/${id}_t.jpg`;
      await fs.writeFile(storedPath(storageKey), main.data);
      await fs.writeFile(storedPath(thumbKey), thumb);
      await db.insert(file).values({
        ...base,
        kind: "photo",
        mime: "image/jpeg",
        sizeBytes: main.info.size,
        width: main.info.width,
        height: main.info.height,
        storageKey,
        thumbKey,
      });
      return id;
    } catch (err) {
      console.warn(`[files] couldn't process ${f.name} as a photo; storing it as a document`, err);
    }
  }

  const ext = path.extname(f.name).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 8);
  const storageKey = `${dir}/${id}${ext}`;
  await fs.writeFile(storedPath(storageKey), buf);
  await db.insert(file).values({
    ...base,
    kind: "document",
    mime: f.type || "application/octet-stream",
    sizeBytes: f.size,
    storageKey,
  });
  return id;
}

export async function listFiles(ownerType: OwnerType, ownerId: string): Promise<FileRow[]> {
  return db
    .select()
    .from(file)
    .where(and(eq(file.ownerType, ownerType), eq(file.ownerId, ownerId)))
    .orderBy(desc(file.createdAt));
}

export async function deleteFile(id: string): Promise<void> {
  const [row] = await db.delete(file).where(eq(file.id, id)).returning();
  if (!row) return;
  for (const key of [row.storageKey, row.thumbKey]) {
    if (key) await fs.rm(storedPath(key), { force: true });
  }
}

export async function deleteFilesFor(ownerType: OwnerType, ownerId: string): Promise<void> {
  for (const f of await listFiles(ownerType, ownerId)) await deleteFile(f.id);
}
