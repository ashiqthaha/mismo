"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createFinding } from "@/app/(app)/findings/actions";
import type { Severity } from "@/lib/db/schema";
import { btnPrimary, btnSecondary, input } from "./ui";
import { uploadFiles } from "./uploader";

const CHOICES: { value: Severity; label: string; on: string }[] = [
  { value: "safety", label: "Safety", on: "bg-sindoor-600 text-white ring-sindoor-600" },
  { value: "fix", label: "Needs fixing", on: "bg-saffron-500 text-white ring-saffron-500" },
  { value: "nice", label: "Nice to have", on: "bg-peacock-600 text-white ring-peacock-600" },
];

/** Quick capture during a walkthrough: a title, a severity, a note and photos. */
export function FindingCapture({ areaId, systems }: { areaId: string; systems: { id: string; name: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [severity, setSeverity] = useState<Severity>("fix");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set("severity", severity);
    fd.set("areaId", areaId);
    try {
      const { id } = await createFinding(fd);
      if (photos.length) await uploadFiles("finding", id, photos);
      formRef.current?.reset();
      setPhotos([]);
      setSeverity("fix");
      setMessage({ ok: true, text: "Saved. Log the next one, or tap Done when this area is finished." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input name="title" required placeholder="What did you notice? e.g. Caulk cracked around tub" className={input} />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Severity">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={severity === c.value}
            onClick={() => setSeverity(c.value)}
            className={`rounded-lg px-2 py-2.5 text-sm font-medium ring-1 ${severity === c.value ? c.on : "bg-white text-sand-700 ring-sand-300"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <textarea name="note" rows={2} placeholder="Details (optional)" className={input} />
      {systems.length > 0 ? (
        <select name="systemId" defaultValue="" className={input} aria-label="About a system">
          <option value="">Not about a specific system</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${btnSecondary} cursor-pointer`}>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files ?? [])])}
          />
          {photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} · add more` : "Add photos"}
        </label>
        {photos.length ? (
          <button type="button" className="text-sm text-sand-500 underline" onClick={() => setPhotos([])}>
            Clear photos
          </button>
        ) : null}
        <button type="submit" className={`${btnPrimary} ml-auto`} disabled={busy}>
          {busy ? (photos.length ? "Saving photos…" : "Saving…") : "Save finding"}
        </button>
      </div>
      {message ? <p className={`text-sm ${message.ok ? "text-brand-800" : "text-sindoor-700"}`}>{message.text}</p> : null}
    </form>
  );
}
