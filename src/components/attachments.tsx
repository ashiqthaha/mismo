import { desc, eq, and } from "drizzle-orm";
import { addLogEntry, removeFile } from "@/app/(app)/actions";
import { shortDate, todayLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { logEntry, user, type OwnerType } from "@/lib/db/schema";
import { listFiles } from "@/lib/files";
import { displayName } from "@/lib/people";
import { SubmitButton } from "./submit-button";
import { Card, CardTitle, btnSecondary, input } from "./ui";
import { Uploader } from "./uploader";

const PHASE_LABEL = { before: "Before", during: "During", after: "After" } as const;

/** Photos and documents attached to one record, with an upload button. */
export async function Attachments({
  ownerType,
  ownerId,
  title = "Photos and files",
  phases = false,
  documents = true,
}: {
  ownerType: OwnerType;
  ownerId: string;
  title?: string;
  phases?: boolean;
  documents?: boolean;
}) {
  const files = await listFiles(ownerType, ownerId);
  const photos = files.filter((f) => f.kind === "photo");
  const docs = files.filter((f) => f.kind === "document");

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {photos.length > 0 ? (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p) => (
            <li key={p.id} className="group relative">
              <a href={`/api/files/${p.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- private files served by our own route */}
                <img src={`/api/files/${p.id}?thumb=1`} alt={p.originalName ?? "Photo"} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
              {p.phase ? (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{PHASE_LABEL[p.phase]}</span>
              ) : null}
              <form action={removeFile.bind(null, p.id)} className="absolute right-1 top-1">
                <button type="submit" className="rounded bg-white/90 px-1.5 text-xs text-red-700 shadow opacity-80 hover:opacity-100" aria-label="Delete photo">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {docs.length > 0 ? (
        <ul className="mb-3 divide-y divide-stone-100 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
              <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-teal-700 hover:underline">
                {d.originalName ?? "Document"}
              </a>
              <form action={removeFile.bind(null, d.id)}>
                <button type="submit" className="text-xs text-red-700 hover:underline">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {files.length === 0 ? <p className="mb-3 text-sm text-stone-500">Nothing attached yet.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Uploader ownerType={ownerType} ownerId={ownerId} phases={phases} />
        {documents ? <Uploader ownerType={ownerType} ownerId={ownerId} label="Add a document" accept="*/*" /> : null}
      </div>
    </Card>
  );
}

/** Dated notes on one record: what happened, decisions and why. */
export async function LogSection({ ownerType, ownerId, title = "Log" }: { ownerType: OwnerType; ownerId: string; title?: string }) {
  const entries = await db
    .select({ e: logEntry, name: user.name, email: user.email })
    .from(logEntry)
    .leftJoin(user, eq(user.id, logEntry.createdBy))
    .where(and(eq(logEntry.ownerType, ownerType), eq(logEntry.ownerId, ownerId)))
    .orderBy(desc(logEntry.createdAt));
  const today = todayLocal();

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <form action={addLogEntry.bind(null, ownerType, ownerId)} className="mb-3 flex flex-col gap-2 sm:flex-row">
        <textarea name="body" rows={2} required className={input} placeholder="What happened, or what was decided and why" />
        <SubmitButton className={`${btnSecondary} shrink-0 self-start`}>Add note</SubmitButton>
      </form>
      {entries.length === 0 ? (
        <p className="text-sm text-stone-500">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(({ e, name, email }) => (
            <li key={e.id} className="text-sm">
              <p className="whitespace-pre-wrap text-stone-800">{e.body}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {displayName({ name, email })} · {shortDate(todayLocal(e.createdAt), today)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
