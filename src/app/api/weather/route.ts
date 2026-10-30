import { connection } from "next/server";
import { houseSky } from "@/lib/weather";

/** The weather at the house for the sign-in page's scene: conditions only, never the location. */
export async function GET() {
  // At request time, not build time, so it follows the server's settings and the sky.
  await connection();
  const sky = await houseSky();
  return Response.json({ sky }, { headers: { "Cache-Control": "private, max-age=300" } });
}
