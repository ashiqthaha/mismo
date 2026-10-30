"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Branch, Cardinal, Owl } from "@/components/birds";
import { createScene, type SceneInputs } from "./scene-engine";
import { useSceneSky } from "./sky-context";

// The sign-in page's scene: a pookalam behind the owl and cardinal, Irish hills
// with Kerala palms, and backwaters with a snake boat. The sky and weather are
// drawn by scene-engine.ts on canvases behind and in front of this. The scene is
// drawn at 360×440 and scaled to cover its box, anchored at the bottom.

const W = 360;
const H = 440;

// Thrown by a tap anywhere on the scene: shamrocks, jasmine and gold sparkles.
const LUCK = [
  '<svg viewBox="0 0 20 20" width="16" height="16"><g fill="#169B62"><circle cx="10" cy="5" r="4.6"/><circle cx="5" cy="12" r="4.6"/><circle cx="15" cy="12" r="4.6"/></g></svg>',
  '<svg viewBox="-10 -10 20 20" width="15" height="15"><g fill="#fff" stroke="#E8DFCF" stroke-width=".8"><ellipse cy="-5" rx="3" ry="4.6"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(72)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(144)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(216)"/><ellipse cy="-5" rx="3" ry="4.6" transform="rotate(288)"/></g><circle r="1.8" fill="#E39B2D"/></svg>',
  '<svg viewBox="0 0 20 20" width="12" height="12"><path d="M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z" fill="#E3B23C"/></svg>',
];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function Palm({ x, flip, delay, sway, swayFor }: { x: number; flip?: boolean; delay: number; sway: number; swayFor: number }) {
  return (
    <g transform={`translate(${x} 0)${flip ? " scale(-1 1)" : ""}`}>
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
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createScene> | null>(null);
  const [scale, setScale] = useState(1);

  const windy = Math.max(sky.wind, sky.gusts * 0.7);
  const inputs = useMemo<SceneInputs>(
    () => ({ ...sky, wind: windy, hour, season, moon }),
    [sky, windy, hour, season, moon],
  );

  useEffect(() => {
    const scene = createScene(back.current!, front.current!, wrap.current!);
    engine.current = scene;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(entry.contentRect.width / W, entry.contentRect.height / H);
      setScale(next);
      scene.resize(next);
    });
    observer.observe(wrap.current!);
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

  const freezing = sky.freezing || sky.tempF <= 32;
  const snowCover = sky.snow > 0 ? Math.min(1, 0.45 + sky.snow * 0.25) : 0;
  const frozen = sky.tempF <= 20;
  const boatOut = !frozen && !sky.thunder && windy <= 35;
  const umbrella = sky.rain >= 0.2 && !freezing && sky.snow === 0;
  const sway = 2 + windy * 0.32;
  const swayFor = Math.max(0.8, 4.2 - windy * 0.07);
  const fade = "transition-opacity duration-1000";

  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden" onPointerDown={luck} aria-hidden>
      <div className="absolute bottom-0 left-1/2 origin-bottom" style={{ width: W, height: H, transform: `translateX(-50%) scale(${scale})` }}>
        <canvas ref={back} className="absolute inset-0 h-full w-full" />
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          <Pookalam />
          <path d="M0 352 Q60 322 130 342 T250 336 T360 340 V440 H0Z" fill="#0F7A52" />
          <path className={fade} style={{ opacity: snowCover }} d="M0 352 Q60 322 130 342 T250 336 T360 340 V350 Q300 348 250 346 T130 352 Q60 334 0 362Z" fill="#FFFFFF" />
          <path d="M0 372 Q90 346 190 366 T360 356 V440 H0Z" fill="#0B5D41" />
          <path className={fade} style={{ opacity: snowCover }} d="M0 372 Q90 346 190 366 T360 356 V366 Q280 368 190 376 Q90 356 0 382Z" fill="#FFFFFF" />
          <Palm x={62} delay={0} sway={sway} swayFor={swayFor} />
          <Palm x={306} flip delay={-1.7} sway={sway} swayFor={swayFor} />
          <rect y="396" width={W} height="44" fill={frozen ? "#D6E8EF" : "#124E5E"} style={{ transition: "fill 1s" }} />
          {!frozen ? (
            <g stroke="#8DBCD0" strokeWidth="1.4" strokeLinecap="round">
              <path className="ripple" d="M30 410h18" />
              <path className="ripple" style={{ animationDelay: "-1s" }} d="M140 420h24" />
              <path className="ripple" style={{ animationDelay: "-2s" }} d="M250 412h16" />
              <path className="ripple" style={{ animationDelay: "-0.5s" }} d="M90 430h20" />
              <path className="ripple" style={{ animationDelay: "-1.6s" }} d="M300 428h22" />
            </g>
          ) : null}
          {/* A chundan vallam, the Kerala snake boat, rowing across. It stays home in storms and ice. */}
          <g className={`boat-row ${fade}`} style={{ opacity: boatOut ? 1 : 0 }}>
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
          <g transform="translate(48 116)">
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
        <div className="pointer-events-none absolute inset-x-0 top-[266px] text-center">
          <p className="gold-foil font-display text-[46px] leading-none font-semibold">Mismo</p>
          <p className="mt-1.5 text-[13px] tracking-[0.14em] text-shamrock-100">WELCOME HOME</p>
        </div>
        <canvas ref={front} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
