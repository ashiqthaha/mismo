"use client";

import type { ReactNode } from "react";
import { describeSky, type SkyIcon } from "@/lib/sky";
import { useSceneSky } from "./sky-context";

const ICONS: Record<SkyIcon, ReactNode> = {
  sun: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  cloud: <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18Z" />,
  rain: <path d="M7 15h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.6 7.4 3.8 3.8 0 0 0 7 15ZM8 18l-1 3M12 18l-1 3M16 18l-1 3" />,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  storm: <path d="M13 3 6 13h5l-1 8 7-10h-5l1-8Z" />,
  fog: <path d="M4 9h16M6 13h12M4 17h16" />,
  smoke: <path d="M4 10c2-2 4 2 6 0s4-2 6 0 4 2 4 0M4 15c2-2 4 2 6 0s4-2 6 0 4 2 4 0" />,
  rainbow: <path d="M3 17a9 9 0 0 1 18 0M6.5 17a5.5 5.5 0 0 1 11 0M10 17a2 2 0 0 1 4 0" />,
};

/** "29° · Freezing drizzle, breezy": the weather at the house, once it has loaded. No place name. */
export function WeatherChip() {
  const { sky, live, hour } = useSceneSky();
  if (!live) return null;
  const { label, icon } = describeSky(sky, hour);
  return (
    <div className="mb-4 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-800">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {ICONS[icon]}
        </svg>
        {sky.tempF}° · {label}
      </span>
    </div>
  );
}
