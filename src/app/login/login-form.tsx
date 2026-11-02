"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { btnPrimary, btnSecondary, input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useSceneSky } from "./sky-context";
import { WeatherChip } from "./weather-chip";

function errorMessage(code: string): string {
  const c = code.toLowerCase();
  if (c.includes("token") || c.includes("expired")) {
    return "That sign-in link has expired or was already used. Ask whoever invited you to send a new one.";
  }
  return "That account isn't invited. Ask the owner to invite your email address.";
}

// Passkeys need WebAuthn; the server assumes yes, the browser checks.
const noop = () => () => {};
const browserHasPasskeys = () => typeof window.PublicKeyCredential === "function";

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3" />
      <path d="M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6" />
      <path d="M12 11v2a14 14 0 0 0 2.5 8" />
      <path d="M8 15a18 18 0 0 0 1.8 6" />
      <path d="M4.9 19a22 22 0 0 1-.9-7v-1a8 8 0 0 1 12-6.95" />
    </svg>
  );
}

/** The white card with a gold kasavu border, the weather at the house, and frost when it's freezing. */
export function LoginCard({ children }: { children: ReactNode }) {
  const { sky, live } = useSceneSky();
  const frost = live && (sky.freezing || sky.tempF <= 32);
  return (
    <div className="kasavu-card rounded-[1.4rem] bg-white p-1.5 shadow-xl shadow-black/25">
      <div className={`kasavu-card-inner rounded-[1.05rem] p-5 ${frost ? "frosty" : "bg-white"}`}>
        <WeatherChip />
        {children}
      </div>
    </div>
  );
}

/**
 * Passkeys only. Sign-in links come from an owner (with an invite, or from Settings),
 * never from this page. The email field lets the browser offer saved passkeys.
 */
export function LoginForm({ google, error }: { google: boolean; error?: string }) {
  const router = useRouter();
  const passkeysWork = useSyncExternalStore(noop, browserHasPasskeys, () => true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Bumped after a failed try, to offer the saved passkeys in the email field again.
  const [round, setRound] = useState(0);

  // Where the browser can, tapping the email field offers this device's passkeys for Mismo.
  useEffect(() => {
    if (!passkeysWork) return;
    let active = true;
    void (async () => {
      const autofill = await window.PublicKeyCredential.isConditionalMediationAvailable?.().catch(() => false);
      if (!autofill || !active) return;
      // Starting the button's sign-in cancels this one; only a real sign-in counts.
      const res = await authClient.signIn.passkey({ autoFill: true });
      if (!active || !res || res.error) return;
      router.replace("/");
      router.refresh();
    })();
    return () => {
      active = false;
    };
  }, [passkeysWork, round, router]);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const res = await authClient.signIn.passkey();
    if (res?.error) {
      setBusy(false);
      setFailed(true);
      setRound((n) => n + 1);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg bg-sindoor-50 p-3 text-sm text-sindoor-800 shadow-sm">{errorMessage(error)}</p> : null}
      <LoginCard>
        {passkeysWork ? (
          <form onSubmit={signIn} noValidate>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-sand-700">Email</span>
              <input
                className={input}
                type="email"
                name="email"
                autoComplete="username webauthn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className={`${btnPrimary} glint mt-3 min-h-12 w-full text-base sm:min-h-12`} disabled={busy}>
              <FingerprintIcon />
              {busy ? "Waiting for your device…" : "Sign in with passkey"}
            </button>
            <p className="mt-2 text-center text-xs text-sand-500">Face ID, fingerprint or Windows Hello</p>
            {failed ? (
              <p className="mt-3 rounded-lg bg-saffron-50 p-2.5 text-sm text-saffron-900">
                That didn&apos;t sign you in. On a new computer, tap the button again, choose the option to use a phone, and scan the code with the phone that has
                your passkey. New here? Use the link in your invite email.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-sand-700">This browser can&apos;t use passkeys. Open Mismo in an up-to-date Safari, Chrome or Edge.</p>
        )}
      </LoginCard>
      {google ? (
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/login" })}
        >
          Sign in with Google
        </button>
      ) : null}
    </div>
  );
}
