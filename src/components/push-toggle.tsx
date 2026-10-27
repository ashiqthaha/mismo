"use client";

import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "./ui";

type State = "loading" | "unsupported" | "off" | "on" | "denied";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Turns phone/browser alerts on or off for this device. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error(await res.text());
      setState("on");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't turn on alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) });
      const { delivered } = (await res.json()) as { delivered: number };
      setNote(delivered ? "Test alert sent." : "No device received it. Try turning alerts off and on.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <p className="text-sm text-stone-500">Checking this device…</p>;
  if (state === "unsupported") {
    return (
      <p className="text-sm text-stone-600">
        {publicKey
          ? "This browser can't receive alerts. On iPhone, first add Mismo to your home screen (Share → Add to Home Screen), then open it from there."
          : "Phone alerts aren't set up on this server yet."}
      </p>
    );
  }
  if (state === "denied") {
    return <p className="text-sm text-stone-600">Alerts are blocked for this site. Allow notifications in your browser or phone settings, then reload.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {state === "on" ? (
          <>
            <button type="button" className={btnSecondary} onClick={test} disabled={busy}>Send a test</button>
            <button type="button" className={btnSecondary} onClick={disable} disabled={busy}>Turn off on this device</button>
          </>
        ) : (
          <button type="button" className={btnPrimary} onClick={enable} disabled={busy}>
            {busy ? "Turning on…" : "Turn on alerts on this device"}
          </button>
        )}
      </div>
      {state === "on" ? <p className="text-sm text-teal-800">Alerts are on for this device.</p> : null}
      {note ? <p className="text-sm text-stone-600">{note}</p> : null}
    </div>
  );
}
