"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { btnPrimary, btnSecondary, input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useSceneSky } from "./sky-context";
import { WeatherChip } from "./weather-chip";

function errorMessage(code: string): string {
  const c = code.toLowerCase();
  if (c.includes("token") || c.includes("expired")) {
    return "That sign-in link has expired or was already used. Ask for a new one below.";
  }
  return "That account isn't invited yet. Ask the owner to invite your email address.";
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/** The white card with a gold kasavu border, the weather at the house, and frost when it's freezing. */
export function LoginCard({ children }: { children: ReactNode }) {
  const { sky, live } = useSceneSky();
  const frost = live && (sky.freezing || sky.tempF <= 32);
  return (
    <div className="kasavu-card rounded-[1.4rem] bg-white p-1.5 shadow-lg shadow-brand-950/10">
      <div className={`kasavu-card-inner rounded-[1.05rem] p-5 ${frost ? "frosty" : "bg-white"}`}>
        <WeatherChip />
        {children}
      </div>
    </div>
  );
}

export function LoginForm({ google, error, devEmail }: { google: boolean; error?: string; devEmail: boolean }) {
  const router = useRouter();
  const passkeysWork = useSyncExternalStore(noop, browserHasPasskeys, () => true);
  const [step, setStep] = useState<"start" | "email" | "sent">("start");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyFailed, setPasskeyFailed] = useState(false);

  async function signInWithPasskey() {
    setPasskeyBusy(true);
    setPasskeyFailed(false);
    const res = await authClient.signIn.passkey();
    if (res?.error) {
      setPasskeyBusy(false);
      setPasskeyFailed(true);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendFailed(false);
    const res = await authClient.signIn.magicLink({ email, callbackURL: "/", errorCallbackURL: "/login" });
    setSending(false);
    if (res.error) setSendFailed(true);
    else setStep("sent");
  }

  if (step === "sent") {
    return (
      <LoginCard>
        <p className="font-display text-lg font-semibold text-brand-800">Check your email</p>
        <p className="mt-1 text-sm text-sand-600">If {email} is invited, a sign-in link is on its way. It works once and lasts 1 hour.</p>
        <p className="mt-3 rounded-lg bg-shamrock-50 p-2.5 text-xs text-shamrock-900">
          Once you&apos;re in, add a passkey in Settings. Next time on this device, signing in is one tap.
        </p>
        {devEmail ? (
          <p className="mt-3 rounded-lg bg-saffron-50 p-2 text-xs text-saffron-900">
            Email isn&apos;t set up on this server, so the link is printed in the server&apos;s console instead.
          </p>
        ) : null}
        <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setStep("email")}>
          Use a different email
        </button>
      </LoginCard>
    );
  }

  const showEmail = step === "email" || !passkeysWork;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg bg-sindoor-50 p-3 text-sm text-sindoor-800">{errorMessage(error)}</p> : null}
      <LoginCard>
        {passkeysWork ? (
          <>
            <button type="button" className={`${btnPrimary} glint min-h-12 w-full text-base sm:min-h-12`} onClick={signInWithPasskey} disabled={passkeyBusy}>
              <FingerprintIcon />
              {passkeyBusy ? "Waiting for your device…" : "Sign in with passkey"}
            </button>
            <p className="mt-2 text-center text-xs text-sand-500">Face ID, fingerprint or Windows Hello</p>
            {passkeyFailed ? (
              <p className="mt-3 rounded-lg bg-saffron-50 p-2.5 text-sm text-saffron-900">
                That didn&apos;t sign you in. If this device doesn&apos;t have a passkey for Mismo yet, get an email link below, then add one in Settings.
              </p>
            ) : null}
            <div className="my-4 flex items-center gap-3 text-xs text-sand-400">
              <span className="h-px flex-1 bg-sand-200" />
              new device?
              <span className="h-px flex-1 bg-sand-200" />
            </div>
          </>
        ) : null}

        {showEmail ? (
          <form onSubmit={sendLink} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-sand-700">Your email</span>
              <input
                className={input}
                type="email"
                required
                autoFocus={step === "email"}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className={`${passkeysWork ? btnSecondary : btnPrimary} w-full`} disabled={sending}>
              <MailIcon />
              {sending ? "Sending…" : "Email me a sign-in link"}
            </button>
            {sendFailed ? <p className="text-sm text-sindoor-700">Something went wrong. Try again in a minute.</p> : null}
          </form>
        ) : (
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => setStep("email")}>
            <MailIcon />
            Email me a sign-in link
          </button>
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
