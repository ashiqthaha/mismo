import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/auth";
import { LoginShell } from "./festive";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <LoginShell>
      <Suspense fallback={<div className="h-52 rounded-[1.4rem] bg-white/70 ring-1 ring-sand-200" />}>
        <LoginBox searchParams={searchParams} />
      </Suspense>
    </LoginShell>
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
