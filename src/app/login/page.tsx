import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BirdsOnBranch } from "@/components/birds";
import { googleEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="henna-band-light" aria-hidden />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <BirdsOnBranch className="mx-auto w-64" />
          <h1 className="mt-2 text-center font-display text-4xl font-semibold text-brand-800">Mismo</h1>
          <p className="mt-1 text-center text-sand-600">Find, plan and track the work on your home.</p>
          <Suspense fallback={<div className="mt-8 h-48 rounded-xl bg-sand-100" />}>
            <LoginBox searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
      <div className="henna-band-light rotate-180" aria-hidden />
    </main>
  );
}

async function LoginBox({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  // Read settings at request time, not build time, so the Google button follows the server's config.
  await connection();
  const { error } = await searchParams;
  return (
    <LoginForm
      google={googleEnabled()}
      error={typeof error === "string" ? error : Array.isArray(error) ? error.at(-1) : undefined}
      devEmail={!process.env.RESEND_API_KEY}
    />
  );
}
