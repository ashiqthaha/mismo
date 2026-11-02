"use client";

import { useState } from "react";

/** Runs a server action that emails a sign-in link, and says when it has gone. */
export function SendLinkButton({ send, label }: { send: () => Promise<void>; label: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function go() {
    setState("sending");
    try {
      await send();
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={state === "sending" || state === "sent"}
      className="text-xs text-brand-700 hover:underline disabled:no-underline disabled:opacity-70"
    >
      {state === "sending" ? "Sending…" : state === "sent" ? "Sent ✓" : state === "failed" ? "Didn't send, try again" : label}
    </button>
  );
}
