"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { markDone } from "@/app/(app)/maintenance/actions";
import { btnPrimary, btnSecondary, input } from "./ui";
import { uploadFiles } from "./uploader";

/** Records a maintenance job as done, with an optional cost, note and photos. */
export function MarkDoneForm({ planId, today }: { planId: string; today: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { logId } = await markDone(planId, new FormData(e.currentTarget));
      if (logId && photos.length) await uploadFiles("maintenance_log", logId, photos);
      formRef.current?.reset();
      setPhotos([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Done on</span>
        <input name="doneOn" type="date" defaultValue={today} max={today} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Cost ($)</span>
        <input name="cost" inputMode="decimal" placeholder="Optional" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Note</span>
        <input name="note" placeholder="e.g. 16x25x1 filter, MERV 11" className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <label className={`${btnSecondary} cursor-pointer`}>
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files ?? [])])} />
          {photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "Add photos"}
        </label>
        <button type="submit" disabled={busy} className={`${btnPrimary} ml-auto`}>
          {busy ? "Saving…" : "Mark done"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-700 sm:col-span-3">{error}</p> : null}
    </form>
  );
}
