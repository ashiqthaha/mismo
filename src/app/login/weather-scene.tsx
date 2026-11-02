"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Branch, Cardinal, Owl } from "@/components/birds";
import { CORE_LAYOUT, createScene, type SceneInputs, type SceneLayout } from "./scene-engine";
import { useSceneSky } from "./sky-context";

// The sign-in page's scene, filling the screen: a pookalam behind the owl and
// cardinal, Irish hills with Kerala palms, and backwaters with a snake boat. The
// sky and weather are drawn by scene-engine.ts on canvases behind and in front of
// this. The birds and pookalam are a 360×440 core; the hills, palms and water
// carry on around it to the edges of the screen.

const CORE_W = 360;
const CORE_H = 440;

/** Wide screens put the card in a column on the right. Matches the `wide` variant in globals.css. */
const WIDE = "(min-width: 1024px) and (min-aspect-ratio: 4/3)";
const CARD_COLUMN = 480;

/**
 * Where the core goes. On a wide screen it fills the height, centred in the part the
 * card leaves open. Otherwise it fits the hero area at the top, and the water carries
 * on under the card to the bottom of the screen.
 */
function layoutFor(vw: number, vh: number, heroH: number, wide: boolean): SceneLayout {
  if (wide) {
    const scale = vh / CORE_H;
    const w = vw / scale;
    const open = (vw - CARD_COLUMN) / scale;
    return { w, h: CORE_H, ox: Math.max(0, open / 2 - CORE_W / 2), oy: 0, scale, open };
  }
  const scale = Math.min(vw / CORE_W, heroH / CORE_H);
  const w = vw / scale;
  return { w, h: vh / scale, ox: (w - CORE_W) / 2, oy: heroH / scale - CORE_H, scale, open: w };
}

// Thrown by a tap anywhere on the scene: shamrocks, jasmine and gold sparkles.
const LUCK = [
  '<svg viewBox="0 0 20 20" width="16" height="16"><g fill="#169B62"><circle cx="10" cy="5" r="4.6"/><circle cx="5" cy="12" r="4.6"/><circle cx="15" cy="12" r="4.6"/></g></svg>',
  '<svg viewBox="-10 -10 20 20" width="15" height="15"><g fill="#fff" stroke="#E8DFCF" stroke-width=".8"><ellipse cy="-5" rx="3" ry="4.6"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(72)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(144)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(216)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(288)"/></g><circle r="1.8" fill="#E39B2D"/></svg>',
  '<svg viewBox="0 0 20 20" width="12" height="12"><path d="M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z" fill="#E3B23C"/></svg>',
];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A steady pseudo-random number from 0 to 1, so the same screen always draws the same way.
 * Integer maths only: the server and the browser must get exactly the same numbers.
 */
const jitter = (i: number) => {
  let t = Math.imul(i + 1, 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A rolling hill line from the left edge to the right, lined up with the core so the middle always looks the same. */
function ridge(w: number, ox: number, base: number, amp: number, span: number, offset: number) {
  let x = ox + offset - Math.ceil((ox + offset) / (2 * span)) * 2 * span;
  const start = x;
  let d = `M${start} ${base} Q${x + span / 2} ${base - amp} ${x + span} ${base}`;
  for (x += span; x < w; x += span) d += ` T${x + span} ${base}`;
  return { line: d, start };
}

/** A pookalam, the Onam flower carpet, blooming in ring by ring and slowly turning. */
function Pookalam() {
  const ring = (count: number, r: number, rx: number, ry: number, fill: string, delay: number, offset = 0) => (
    <g className="bloom" style={{ animationDelay: `${delay}s` }} fill={fill}>
      {Array.from({ length: count }, (_, i) => (
        <ellipse key={i} cy={-r} rx={rx} ry={ry} transform={`rotate(${offset + (360 / count) * i})`} />
      ))}
    </g>
  );
  return (
    <g transform="translate(180 150)">
      <g className="slow-turn">
        <g className="bloom" style={{ animationDelay: "0.9s" }}>
          <circle r="96" fill="none" stroke="#F6D77A" strokeWidth="3" strokeDasharray="0.1 6" strokeLinecap="round" />
        </g>
        {ring(18, 80, 7, 12, "#2FB175", 0.7)}
        {ring(18, 80, 3, 5, "#F6D77A", 0.75, 10)}
        <circle className="bloom" style={{ animationDelay: "0.5s" }} r="64" fill="#A8322D" opacity="0.85" />
        {ring(14, 47, 9, 15, "#E39B2D", 0.35)}
        <circle className="bloom" style={{ animationDelay: "0.2s" }} r="29" fill="#FBF7EF" />
        {ring(6, 15, 6, 10, "#169B62", 0.1)}
        <circle className="bloom" r="6" fill="#F6D77A" />
      </g>
    </g>
  );
}

/** A coconut palm standing at x, its foot on the shore at y. Smaller ones look further away. */
function Palm({ x, y, size = 1, flip, delay, sway, swayFor }: { x: number; y: number; size?: number; flip?: boolean; delay: number; sway: number; swayFor: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -size : size} ${size}) translate(0 -392)`}>
      <g className="palm-sway" style={{ "--sway": `${sway}deg`, animationDuration: `${swayFor}s`, animationDelay: `${delay}s` } as CSSProperties}>
        <path d="M-4 392 Q-12 330 0 290" stroke="#052B1F" strokeWidth="6" fill="none" />
        <g fill="#052B1F">
          <path d="M0 290 Q-38 272 -56 300 Q-28 280 0 292Z" />
          <path d="M0 290 Q34 262 46 292 Q24 276 0 292Z" />
          <path d="M0 290 Q-18 248 -44 252 Q-14 262 -1 291Z" />
          <path d="M0 290 Q18 244 42 250 Q12 260 1 291Z" />
        </g>
      </g>
    </g>
  );
}

export function WeatherScene() {
  const { sky, hour, season, moon } = useSceneSky();
  const wrap = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createScene> | null>(null);
  const [layout, setLayout] = useState<SceneLayout | null>(null);

  const windy = Math.max(sky.wind, sky.gusts * 0.7);
  const inputs = useMemo<SceneInputs>(
    () => ({ ...sky, wind: windy, hour, season, moon }),
    [sky, windy, hour, season, moon],
  );

  useEffect(() => {
    const scene = createScene(back.current!, front.current!, wrap.current!);
    engine.current = scene;
    const wide = window.matchMedia(WIDE);
    // Kept here, not read from the refs, so a late resize after leaving the page still finds them.
    const wrapEl = wrap.current!;
    const heroEl = hero.current!;
    const measure = () => {
      const box = wrapEl.getBoundingClientRect();
      const heroH = heroEl.getBoundingClientRect().height;
      // Mid-resize a box can measure zero, which would make the scene endlessly wide.
      if (!(box.width > 0 && box.height > 0 && heroH > 0)) return;
      const next = layoutFor(box.width, box.height, heroH, wide.matches);
      setLayout(next);
      scene.resize(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(wrapEl);
    observer.observe(heroEl);
    scene.start(reducedMotion());
    return () => {
      observer.disconnect();
      scene.stop();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.set(inputs);
  }, [inputs]);

  function luck(e: PointerEvent<HTMLDivElement>) {
    if (reducedMotion()) return;
    const host = e.currentTarget;
    const box = host.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const piece = document.createElement("span");
      piece.className = "lucky-piece";
      piece.innerHTML = LUCK[i % LUCK.length];
      const angle = Math.random() * Math.PI * 2;
      const reach = 50 + Math.random() * 80;
      piece.style.left = `${e.clientX - box.left}px`;
      piece.style.top = `${e.clientY - box.top}px`;
      piece.style.setProperty("--x", `${Math.cos(angle) * reach}px`);
      piece.style.setProperty("--y", `${Math.sin(angle) * reach}px`);
      piece.addEventListener("animationend", () => piece.remove());
      host.appendChild(piece);
    }
  }

  const { w, h, ox, oy, scale } = layout ?? CORE_LAYOUT;
  const freezing = sky.freezing || sky.tempF <= 32;
  const snowCover = sky.snow > 0 ? Math.min(1, 0.45 + sky.snow * 0.25) : 0;
  const frozen = sky.tempF <= 20;
  const boatOut = !frozen && !sky.thunder && windy <= 35;
  const umbrella = sky.rain >= 0.2 && !freezing && sky.snow === 0;
  const sway = 2 + windy * 0.32;
  const swayFor = Math.max(0.8, 4.2 - windy * 0.07);
  const fade = "transition-opacity duration-1000";
  const shore = oy + 396;

  const land = useMemo(() => {
    const far = ridge(w, ox, oy + 344, 26, 125, 0);
    const near = ridge(w, ox, oy + 366, 22, 150, 40);
    // The two palms by the birds, then more along the shore out to both edges, a little smaller.
    const palms = [
      { x: ox + 62, size: 1, flip: false },
      { x: ox + 306, size: 1, flip: true },
    ];
    for (let i = 1, x = ox + 62 - 150; x > -60; i++, x -= Math.round(130 + jitter(i) * 90)) palms.push({ x, size: Math.round(78 + jitter(i + 7) * 20) / 100, flip: i % 2 === 1 });
    for (let i = 1, x = ox + 306 + 150; x < w + 60; i++, x += Math.round(130 + jitter(i + 3) * 90)) palms.push({ x, size: Math.round(78 + jitter(i + 11) * 20) / 100, flip: i % 2 === 0 });
    const ripples: { x: number; y: number; len: number; delay: number }[] = [];
    for (let y = shore + 14, row = 0; y < h - 4; y += 16, row++) {
      for (let x = ((row * 37) % 90) - 40, i = 0; x < w; x += 110, i++) {
        const n = row * 31 + i;
        ripples.push({ x: Math.round(x + jitter(n) * 60), y, len: Math.round(14 + jitter(n + 5) * 12), delay: -Math.round(jitter(n + 9) * 32) / 10 });
      }
    }
    return { far, near, palms, ripples };
  }, [w, h, ox, oy, shore]);

  return (
    <div ref={wrap} className="fixed inset-0 overflow-hidden bg-brand-900" onPointerDown={luck} aria-hidden>
      {/* Measures the hero area at the top on a phone; the card's top padding uses the same height. */}
      <div ref={hero} className="pointer-events-none invisible absolute inset-x-0 top-0 h-[min(30rem,62svh)]" />
      <div
        className="absolute top-0 left-0 origin-top-left transition-opacity duration-500"
        style={{ width: w, height: h, transform: `scale(${scale})`, opacity: layout ? 1 : 0 }}
      >
        <canvas ref={back} className="absolute inset-0 h-full w-full" />
        <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="deep-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#04222B" stopOpacity="0" />
              <stop offset="1" stopColor="#04222B" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <g transform={`translate(${ox} ${oy})`}>
            <Pookalam />
          </g>
          <path d={`${land.far.line} V${h} H${land.far.start}Z`} fill="#0F7A52" />
          <path className={fade} style={{ opacity: snowCover }} d={land.far.line} stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d={`${land.near.line} V${h} H${land.near.start}Z`} fill="#0B5D41" />
          <path className={fade} style={{ opacity: snowCover }} d={land.near.line} stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" fill="none" />
          {land.palms.map((p, i) => (
            <Palm key={i} x={p.x} y={shore - 4} size={p.size} flip={p.flip} delay={-Math.round(jitter(i + 1) * 40) / 10} sway={sway} swayFor={swayFor} />
          ))}
          <rect y={shore} width={w} height={h - shore} fill={frozen ? "#D6E8EF" : "#124E5E"} style={{ transition: "fill 1s" }} />
          {h - shore > 60 ? <rect y={shore + 40} width={w} height={h - shore - 40} fill="url(#deep-water)" /> : null}
          {!frozen ? (
            <g stroke="#8DBCD0" strokeWidth="1.4" strokeLinecap="round">
              {land.ripples.map((r, i) => (
                <path key={i} className="ripple" style={{ animationDelay: `${r.delay}s` }} d={`M${r.x} ${r.y}h${r.len}`} />
              ))}
            </g>
          ) : null}
          {/* A chundan vallam, the Kerala snake boat, rowing across. It stays home in storms and ice. */}
          <g transform={`translate(0 ${oy})`}>
            <g
              className={`boat-row ${fade}`}
              style={{ opacity: boatOut ? 1 : 0, "--row-to": `${w + 20}px`, animationDuration: `${(26 * (w + 190)) / 570}s` } as CSSProperties}
            >
              <g className="boat-rock" style={{ "--bob": `${1 + windy / 8}px` } as CSSProperties}>
                <path d="M0 412 Q70 420 140 410 Q150 400 156 384 Q152 400 146 412 Q70 426 0 414Z" fill="#3B2412" />
                <path d="M6 413 Q70 420 138 411" stroke="#C9A227" strokeWidth="1.2" fill="none" />
                <g fill="#FBF7EF">
                  {[[20, 408], [36, 409], [52, 410], [68, 410], [84, 410], [100, 409], [116, 408]].map(([cx, cy]) => (
                    <circle key={cx} cx={cx} cy={cy} r="2.6" />
                  ))}
                </g>
                <path d="M18 410l-6 10M34 411l-6 10M50 412l-6 10M66 412l-6 10M82 412l-6 10M98 411l-6 10M114 410l-6 10" stroke="#3B2412" strokeWidth="1.2" />
                <path d="M150 388l6-8" stroke="#E39B2D" strokeWidth="2" />
              </g>
            </g>
          </g>
          <g transform={`translate(${ox + 48} ${oy + 116})`}>
            <Branch />
            <path className={fade} style={{ opacity: snowCover ? 1 : 0 }} d="M2 124 Q90 104 170 117 T262 106" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" />
            <g className={fade} style={{ opacity: freezing && sky.rain > 0 ? 1 : 0 }} fill="#DDF3FF">
              <path d="M30 122l3 12 3-12Z" />
              <path d="M70 117l2 9 2-9Z" />
              <path d="M120 114l3 13 3-13Z" />
              <path d="M160 119l2 8 2-8Z" />
              <path d="M205 121l3 11 3-11Z" />
            </g>
            <Owl x="40" y="28" width="80" height="88" />
            <rect className="owl-blink" x="58.4" y="52.8" width="43.2" height="20.8" rx="9.6" fill="#0B6E4F" />
            <g transform="translate(40 28) scale(0.8)">
              {/* A red scarf when it's cold, and a little snow on the owl's head when it snows. */}
              <g className={fade} style={{ opacity: sky.tempF < 40 ? 1 : 0 }}>
                <path d="M22 60 Q50 72 78 60 L78 68 Q50 80 22 68Z" fill="#A8322D" />
                <path d="M62 70 l8 20 l-8 1Z" fill="#A8322D" />
                <path d="M30 63v6M38 66v6M46 67v6M54 67v6M62 66v6M70 63v6" stroke="#F6D77A" strokeWidth="1.4" />
              </g>
              <ellipse className={fade} style={{ opacity: snowCover ? 1 : 0 }} cx="50" cy="22" rx="26" ry="7" fill="#FFFFFF" />
            </g>
            {/* An olakkuda, the Kerala palm-leaf umbrella, over the owl in the rain. */}
            <g className={fade} style={{ opacity: umbrella ? 1 : 0 }}>
              <path d="M80 18 V60" stroke="#3B2412" strokeWidth="2.2" />
              <path d="M30 34 Q80 -18 130 34 Q105 26 80 34 Q55 26 30 34Z" fill="#D9B26A" />
              <path d="M80 6 L40 32 M80 6 L60 30 M80 6 L80 32 M80 6 L100 30 M80 6 L120 32" stroke="#A07A3A" strokeWidth="1" />
            </g>
            <g className="bird-bob">
              <Cardinal x="152" y="60" width="78" height="62" />
            </g>
          </g>
        </svg>
        <div className="pointer-events-none absolute text-center" style={{ left: ox, top: oy + 266, width: CORE_W }}>
          <p className="gold-foil font-display text-[46px] leading-none font-semibold">Mismo</p>
          <p className="mt-1.5 text-[13px] tracking-[0.14em] text-shamrock-100">WELCOME HOME</p>
        </div>
        <canvas ref={front} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
