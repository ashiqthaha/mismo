import type { ReactNode, SVGProps } from "react";
import { BirdsOnBranch } from "@/components/birds";

// The sign-in page's decoration, half St Patrick's Day and half Kerala: gold
// sparkles, shamrocks and jasmine drifting up, and a pookalam (the Onam flower
// carpet) turning slowly behind the birds. The motion lives in globals.css and
// stops for anyone who has asked their device for less motion.

const SPARKLES = [
  { left: "12%", top: "14%", size: 14, delay: "0.2s", color: "#C9A227" },
  { left: "82%", top: "20%", size: 16, delay: "1.1s", color: "#E39B2D" },
  { left: "24%", top: "38%", size: 9, delay: "1.9s", color: "#169B62" },
  { left: "70%", top: "9%", size: 10, delay: "0.7s", color: "#C9A227" },
  { left: "7%", top: "66%", size: 14, delay: "2.4s", color: "#E39B2D" },
  { left: "90%", top: "58%", size: 10, delay: "1.5s", color: "#169B62" },
  { left: "14%", top: "88%", size: 11, delay: "0.4s", color: "#C9A227" },
  { left: "84%", top: "84%", size: 13, delay: "2s", color: "#E39B2D" },
];

const DRIFTERS = [
  { left: "6%", delay: "0s", size: 14, kind: "shamrock" },
  { left: "18%", delay: "4s", size: 13, kind: "jasmine" },
  { left: "31%", delay: "8.5s", size: 10, kind: "shamrock" },
  { left: "74%", delay: "6s", size: 10, kind: "shamrock" },
  { left: "86%", delay: "2s", size: 14, kind: "shamrock" },
  { left: "94%", delay: "7s", size: 13, kind: "jasmine" },
  { left: "52%", delay: "10s", size: 12, kind: "jasmine" },
] as const;

function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden {...props}>
      <path d="M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z" fill="currentColor" />
    </svg>
  );
}

function ShamrockLeaf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 22" aria-hidden {...props}>
      <path d="M10 13 Q11 18 9 22" stroke="#0B6E4F" strokeWidth="1.4" fill="none" />
      <g fill="#169B62">
        <circle cx="10" cy="5" r="4.6" />
        <circle cx="5" cy="12" r="4.6" />
        <circle cx="15" cy="12" r="4.6" />
      </g>
    </svg>
  );
}

function Jasmine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden {...props}>
      <g fill="#FFFFFF" stroke="#E8DFCF" strokeWidth="0.8">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cy="-5" rx="3" ry="4.6" transform={`rotate(${deg})`} />
        ))}
      </g>
      <circle r="1.8" fill="#E39B2D" />
    </svg>
  );
}

/** A pookalam: rings of petals in the house colours, like an Onam flower carpet. */
function Pookalam(props: SVGProps<SVGSVGElement>) {
  const ring = (count: number, radius: number, rx: number, ry: number, fill: string, offset = 0) =>
    Array.from({ length: count }, (_, i) => (
      <ellipse
        key={`${radius}-${i}`}
        cy={-radius}
        rx={rx}
        ry={ry}
        fill={fill}
        transform={`rotate(${offset + (360 / count) * i})`}
      />
    ));
  return (
    <svg viewBox="-50 -50 100 100" aria-hidden {...props}>
      <circle r="49" fill="none" stroke="#E39B2D" strokeWidth="1.4" strokeDasharray="0.1 3.4" strokeLinecap="round" />
      {ring(16, 41, 3.4, 6, "#169B62")}
      {ring(16, 41, 1.6, 3, "#C9A227", 11.25)}
      <circle r="33" fill="none" stroke="#A8322D" strokeWidth="1.2" />
      {ring(12, 26, 3.2, 5.5, "#E39B2D")}
      <circle r="18" fill="none" stroke="#0B6E4F" strokeWidth="1.2" strokeDasharray="2 2" />
      {ring(8, 10, 2.6, 4.4, "#A8322D", 22.5)}
      <circle r="3.5" fill="#C9A227" />
    </svg>
  );
}

/** Sparkles and drifting leaves and flowers behind everything on the page. */
function FestiveBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SPARKLES.map((s, i) => (
        <span key={i} className="twinkle absolute" style={{ left: s.left, top: s.top, color: s.color, animationDelay: s.delay }}>
          <Sparkle width={s.size} height={s.size} />
        </span>
      ))}
      {DRIFTERS.map((d, i) => (
        <span key={i} className="drift-up absolute bottom-6" style={{ left: d.left, animationDelay: d.delay }}>
          {d.kind === "shamrock" ? <ShamrockLeaf width={d.size} height={d.size * 1.1} /> : <Jasmine width={d.size} height={d.size} />}
        </span>
      ))}
    </div>
  );
}

/** The frame shared by the sign-in and confirm pages. */
export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="henna-band-light" aria-hidden />
      <FestiveBackground />
      <div className="relative flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="relative mx-auto h-36 w-64">
            <Pookalam className="slow-turn absolute left-1/2 top-[-14px] -ml-[84px] h-[168px] w-[168px] opacity-25" />
            <BirdsOnBranch className="absolute inset-x-0 bottom-0 w-64" />
          </div>
          <h1 className="mt-3 text-center font-display text-4xl font-semibold text-brand-800">Mismo</h1>
          <p className="mt-1 text-center text-sand-600">Welcome home</p>
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
      <div className="henna-band-light rotate-180" aria-hidden />
    </main>
  );
}
