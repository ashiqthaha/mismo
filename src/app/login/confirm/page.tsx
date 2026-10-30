import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginShell } from "../festive";
import { LoginCard } from "../login-form";
import { ConfirmButton } from "./confirm-button";

export const metadata: Metadata = { title: "Sign in" };

// Sign-in emails link here rather than to the sign-in link itself. Mail scanners
// and link previews open links on their own; here they only find a button.
export default function ConfirmPage({ searchParams }: PageProps<"/login/confirm">) {
  return (
    <LoginShell>
      <div className="mt-6">
        <LoginCard>
          <Suspense fallback={<div className="h-28" />}>
            <Confirm searchParams={searchParams} />
          </Suspense>
        </LoginCard>
      </div>
    </LoginShell>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/login/confirm">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <>
        <p className="font-display text-lg font-semibold text-brand-800">This link is incomplete</p>
        <p className="mt-1 text-sm text-sand-600">Open the newest Mismo email and tap its button, or ask for a new link.</p>
        <Link href="/login" className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">Back to sign in</Link>
      </>
    );
  }
  return (
    <>
      <p className="font-display text-lg font-semibold text-brand-800">One more tap</p>
      <p className="mt-1 text-sm text-sand-600">Tap the button to finish signing in. The link works once.</p>
      <ConfirmButton token={token} />
    </>
  );
}
