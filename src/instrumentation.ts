// Runs once when the server starts: bring the database up to date, load the
// starter data on first run, and start the reminder scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureMigrated } = await import("./lib/db");
  await ensureMigrated();

  const { seedIfEmpty } = await import("./lib/seed");
  if (await seedIfEmpty()) {
    console.log("[mismo] loaded starter areas, systems and maintenance plans");
  }

  if (process.env.SCHEDULER !== "off") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
