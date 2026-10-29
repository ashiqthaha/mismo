"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import type { OwnerType } from "@/lib/db/schema";
import { btnSecondary, input } from "./ui";

/** Uploads files to /api/upload for one record. Returns the new file ids. */
export async function uploadFiles(ownerType: OwnerType, ownerId: string, files: File[], phase?: string): Promise<string[]> {
  if (files.length === 0) return [];
  const fd = new FormData();
  fd.set("ownerType", ownerType);
  fd.set("ownerId", ownerId);
  if (phase) fd.set("phase", phase);
  for (const f of files) fd.append("files", f);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.text()) || "Upload failed");
  return ((await res.json()) as { ids: string[] }).ids;
}

export function Uploader({
  ownerType,
  ownerId,
  label = "Add photos",
  accept = "image/*",
  phases = false,
}: {
  ownerType: OwnerType;
  ownerId: string;
  label?: string;
  accept?: string;
  phases?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await uploadFiles(ownerType, ownerId, picked, phase);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {phases ? (
        <select className={`${input} w-auto`} value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Photo stage">
          <option value="">No stage</option>
          <option value="before">Before</option>
          <option value="during">During</option>
          <option value="after">After</option>
        </select>
      ) : null}
      <label className={`${btnSecondary} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <input type="file" multiple accept={accept} className="sr-only" onChange={onChange} disabled={busy} />
        {busy ? "Uploading…" : label}
      </label>
      {error ? <p className="w-full text-sm text-sindoor-700">{error}</p> : null}
    </div>
  );
}
