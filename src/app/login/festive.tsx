import type { ReactNode } from "react";
import { SkyProvider } from "./sky-context";
import { WeatherScene } from "./weather-scene";

// The frame shared by the sign-in and confirm pages: the live-weather scene on top
// (on the left on a computer) with the sign-in card below it (on the right).

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <SkyProvider>
      <main className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <h1 className="sr-only">Mismo</h1>
        <div className="relative h-[min(30rem,62svh)] bg-brand-900 lg:h-full">
          <WeatherScene />
          <div className="henna-scallop pointer-events-none absolute inset-x-0 bottom-0 lg:hidden" aria-hidden />
        </div>
        <div className="relative -mt-3 flex justify-center px-4 pb-8 lg:mt-0 lg:items-center lg:overflow-y-auto lg:py-10">
          <div className="w-full max-w-sm">
            {children}
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-sand-500">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
                <rect x="4" y="9" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Private to this household. Invited people only.
            </p>
          </div>
        </div>
      </main>
    </SkyProvider>
  );
}
