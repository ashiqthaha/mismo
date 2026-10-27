import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-teal-800">Mismo</h1>
        <p className="mt-1 text-stone-600">Find, plan and track the work on your home.</p>
        <Suspense fallback={<div className="mt-8 h-48 rounded-xl bg-stone-100" />}>
          <LoginBox searchParams={searchParams} />
        </Suspense>
      </div>
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
