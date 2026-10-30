"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { btnPrimary, btnSecondary } from "./ui";

/** A name for this device, so the list of passkeys says where each one lives. */
function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Windows/.test(ua)) return "Windows computer";
  if (/Macintosh/.test(ua)) return "Mac";
  return "This device";
}

/** Saves a passkey for the signed-in person on this phone or computer. */
export function AddPasskey({ first }: { first: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setNote(null);
    const res = await authClient.passkey.addPasskey({ name: deviceName() });
    setBusy(false);
    if (res?.error) {
      setNote("No passkey was saved. If you closed the prompt, try again.");
      return;
    }
    setNote("Passkey saved. Next time, tap Sign in with passkey.");
    router.refresh();
  }

  return (
    <div>
      <button type="button" className={`${first ? btnPrimary : btnSecondary} w-full sm:w-auto`} onClick={add} disabled={busy}>
        {busy ? "Waiting for your device…" : "Add a passkey on this device"}
      </button>
      {note ? <p className="mt-2 text-sm text-sand-600">{note}</p> : null}
    </div>
  );
}
