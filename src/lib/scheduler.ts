import { dispatchPending } from "./notify";
import { runReminders } from "./reminders";

const g = globalThis as typeof globalThis & { __mismoScheduler?: ReturnType<typeof setInterval> };

/** Every 5 minutes: queue due reminders, then send what's queued. One timer per process. */
export function startScheduler(): void {
  if (g.__mismoScheduler) return;
  const tick = async () => {
    try {
      await runReminders();
      await dispatchPending();
    } catch (err) {
      console.error("[scheduler]", err);
    }
  };
  setTimeout(tick, 10_000);
  g.__mismoScheduler = setInterval(tick, 5 * 60_000);
}
