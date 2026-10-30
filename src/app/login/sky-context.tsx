"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { CALM_SKY, SKY_EXAMPLES, houseHours, moonPhase, seasonOf, type Season, type Sky } from "@/lib/sky";

export type SceneSky = {
  sky: Sky;
  /** True once real weather (or a development example) has arrived. */
  live: boolean;
  hour: number;
  season: Season;
  moon: number;
};

const SkyContext = createContext<SceneSky | null>(null);

const REFRESH_MS = 15 * 60 * 1000;
const noop = () => () => {};
const readSearch = () => window.location.search;

function everyMinute(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}
const readMinute = () => Math.floor(Date.now() / 60_000);

/** Loads the weather at the house for the sign-in scene and keeps it fresh. */
export function SkyProvider({ children }: { children: ReactNode }) {
  const [sky, setSky] = useState<Sky | null>(null);
  // Re-render once a minute so the sun and moon move.
  const minute = useSyncExternalStore(everyMinute, readMinute, () => 0);
  const search = useSyncExternalStore(noop, readSearch, () => "");
  // Development only: /login?sky=storm shows an example mix instead of the live weather.
  const example = process.env.NODE_ENV !== "production" ? SKY_EXAMPLES[new URLSearchParams(search).get("sky") ?? ""] : undefined;

  useEffect(() => {
    if (example) return;
    let stopped = false;
    const load = () =>
      fetch("/api/weather")
        .then((r) => (r.ok ? (r.json() as Promise<{ sky: Sky | null }>) : null))
        .then((j) => {
          if (!stopped && j?.sky) setSky(j.sky);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [example]);

  const now = minute ? new Date(minute * 60_000) : new Date(0);
  const value: SceneSky = {
    sky: example ? { ...CALM_SKY, ...example } : (sky ?? CALM_SKY),
    live: Boolean(example || sky),
    hour: example?.hour ?? (minute ? houseHours(now) : 12),
    season: example?.season ?? (minute ? seasonOf(now) : "autumn"),
    moon: example?.moon ?? (minute ? moonPhase(now) : 0.25),
  };
  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSceneSky(): SceneSky {
  const v = useContext(SkyContext);
  if (!v) throw new Error("useSceneSky needs a SkyProvider");
  return v;
}
