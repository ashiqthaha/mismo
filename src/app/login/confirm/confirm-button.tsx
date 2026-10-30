"use client";

import { useState } from "react";
import { btnPrimary } from "@/components/ui";

// A button, not a link: crawlers follow links, but only a person clicks.
export function ConfirmButton({ token }: { token: string }) {
  const [going, setGoing] = useState(false);
  function signIn() {
    setGoing(true);
    // A full page load, not a client navigation: the sign-in API sets the cookie and redirects.
    const url = new URL("/api/auth/magic-link/verify", window.location.origin);
    url.search = new URLSearchParams({ token, callbackURL: "/", errorCallbackURL: "/login" }).toString();
    window.location.assign(url.href);
  }
  return (
    <button type="button" className={`${btnPrimary} mt-4 min-h-12 w-full text-base sm:min-h-12`} onClick={signIn} disabled={going}>
      {going ? "Signing in…" : "Sign in"}
    </button>
  );
}
