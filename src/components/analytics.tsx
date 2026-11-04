import { connection } from "next/server";
import Script from "next/script";

// Optional page analytics (Rybbit). The script's address, site ID included, is read
// from the server's .env (RYBBIT_SCRIPT_URL) at request time; without it nothing loads.
export async function Analytics() {
  await connection();
  const src = process.env.RYBBIT_SCRIPT_URL;
  if (!src) return null;
  // The confirm page's address carries a one-time sign-in token, so it's never reported.
  return <Script src={src} strategy="afterInteractive" data-skip-patterns='["/login/confirm"]' />;
}
