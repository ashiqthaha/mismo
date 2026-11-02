import type { ReactNode } from "react";
import { SkyProvider } from "./sky-context";
import { WeatherScene } from "./weather-scene";

// The frame shared by the sign-in and confirm pages: the live-weather scene fills the
// screen, and the sign-in card floats over it. On a phone the card sits below the birds,
// over the water; on a wide screen it floats on the right.

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <SkyProvider>
      <main className="relative min-h-dvh">
        <h1 className="sr-only">Mismo</h1>
        <WeatherScene />
        <div className="pointer-events-none relative flex min-h-dvh justify-center px-4 pt-[calc(min(30rem,62svh)-0.75rem)] pb-8 wide:absolute wide:inset-y-0 wide:right-0 wide:min-h-0 wide:w-[30rem] wide:items-center wide:overflow-y-auto wide:px-12 wide:py-10">
          <div className="pointer-events-auto w-full max-w-sm">
            {children}
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-white/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)]">
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
