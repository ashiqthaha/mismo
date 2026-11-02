import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddPasskey } from "@/components/add-passkey";
import { BirdsOnBranch } from "@/components/birds";
import { PageSkeleton } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome" };

// Where a sign-in link lands: offer a passkey on this device, so it never needs a link again.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WelcomePage />
    </Suspense>
  );
}

async function WelcomePage() {
  const me = await requireUser();
  return (
    <div className="mx-auto max-w-md space-y-4 pt-2">
      <Card>
        <BirdsOnBranch className="mx-auto mb-2 h-20 w-auto" />
        <h2 className="text-center font-display text-xl font-semibold text-brand-800">{me.name ? `Welcome, ${me.name}` : "You're in"}</h2>
        <p className="mt-2 text-center text-sm text-sand-600">
          Add a passkey on this phone or computer. Next time you sign in with Face ID, your fingerprint or Windows Hello, with no email needed.
        </p>
        <div className="mt-4 flex flex-col items-stretch gap-3 [&_button]:w-full">
          <AddPasskey first then="/" />
          <Link href="/" className="text-center text-sm font-medium text-brand-700 hover:underline">
            Not now
          </Link>
        </div>
      </Card>
    </div>
  );
}
