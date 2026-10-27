"use client";

import { useState, type FormEvent } from "react";
import { btnPrimary, btnSecondary, input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

function errorMessage(code: string): string {
  const c = code.toLowerCase();
  if (c.includes("token") || c.includes("expired")) {
    return "That sign-in link has expired or was already used. Ask for a new one below.";
  }
  return "That account isn't invited yet. Ask the owner to invite your email address.";
}

export function LoginForm({ google, error, devEmail }: { google: boolean; error?: string; devEmail: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await authClient.signIn.magicLink({ email, callbackURL: "/", errorCallbackURL: "/login" });
    setState(res.error ? "failed" : "sent");
  }

  if (state === "sent") {
    return (
      <div className="mt-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="font-medium text-stone-900">Check your email</p>
        <p className="mt-1 text-sm text-stone-600">
          If {email} is invited, a sign-in link is on its way. It works once and expires in 15 minutes.
        </p>
        {devEmail ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            Email isn&apos;t set up on this server, so the link is printed in the server&apos;s console instead.
          </p>
        ) : null}
        <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setState("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorMessage(error)}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Email</span>
          <input
            className={input}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" className={`${btnPrimary} w-full`} disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {state === "failed" ? <p className="text-sm text-red-700">Something went wrong. Try again in a minute.</p> : null}
      </form>
      {google ? (
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/login" })}
        >
          Sign in with Google
        </button>
      ) : null}
      <p className="text-center text-xs text-stone-500">Mismo is invite-only.</p>
    </div>
  );
}
