import type { Season } from "@/lib/sky";

// Draws the sign-in scene's sky and weather on two canvases. The back one (stars,
// sun or moon, rainbow, clouds, lightning) sits behind the hills and birds; the
// front one (rain, snow, hail, leaves, fireflies, fog, haze, frost) sits in front.
// Every input is a plain number, so any mix of weather draws itself, and numbers
// ease toward new readings so a change of weather drifts in rather than jumps.
// The scene fills the screen: the birds and pookalam are a 360×440 core placed at
// (ox, oy), and the sky, hills, water and weather carry on around it.

export type SceneInputs = {
  hour: number;
  sunrise: number;
  sunset: number;
  cloud: number;
  rain: number;
  snow: number;
  wind: number;
  tempF: number;
  fog: number;
  aqi: number;
  moon: number;
  thunder: boolean;
  hail: boolean;
  freezing: boolean;
  rainJustStopped: boolean;
  season: Season;
};

/** The scene's size in drawing units, where the core sits, its on-screen scale, and how much the card leaves open. */
export type SceneLayout = { w: number; h: number; ox: number; oy: number; scale: number; open: number };

export const CORE_LAYOUT: SceneLayout = { w: 360, h: 440, ox: 0, oy: 0, scale: 1, open: 360 };

type RGB = [number, number, number];
const EASED = ["cloud", "rain", "snow", "wind", "tempF", "fog", "aqi"] as const;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: RGB, b: RGB, k: number): RGB => {
  const t = clamp(k, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Height of the sun (0 to 1 by day) or depth of the night (0 to -1), from sunrise and sunset. */
function sunHeight(p: SceneInputs): number {
  const { hour, sunrise, sunset } = p;
  if (hour >= sunrise && hour <= sunset) return Math.sin((Math.PI * (hour - sunrise)) / (sunset - sunrise));
  const night = 24 - (sunset - sunrise);
  const since = hour > sunset ? hour - sunset : hour + 24 - sunset;
  return -Math.sin((Math.PI * since) / night);
}

/** How far across the sky the sun (by day) or moon (by night) has travelled, 0 to 1. */
function arcPosition(p: SceneInputs): number {
  const { hour, sunrise, sunset } = p;
  if (hour >= sunrise && hour <= sunset) return (hour - sunrise) / (sunset - sunrise);
  const night = 24 - (sunset - sunrise);
  return (hour > sunset ? hour - sunset : hour + 24 - sunset) / night;
}

export function createScene(back: HTMLCanvasElement, front: HTMLCanvasElement, skyEl: HTMLElement) {
  const bk = back.getContext("2d")!;
  const fr = front.getContext("2d")!;
  let target: SceneInputs | null = null;
  let cur: SceneInputs | null = null;
  let raf = 0;
  let still = false;
  let lastSky = "";
  let top: RGB = [0, 0, 0];
  let flash = 0;
  let bolt: { pts: [number, number][]; until: number } | null = null;
  let nextBolt = 0;
  let L = CORE_LAYOUT;
  // How many 360×440 scenes fit on screen, and how many side by side: more screen, more rain.
  let area = 1;
  let across = 1;

  const many = <T>(n: number, make: () => T) => Array.from({ length: Math.ceil(n) }, make);
  let stars: { x: number; y: number; r: number; p: number }[] = [];
  let clouds: { x: number; y: number; s: number; v: number }[] = [];
  let drops: { x: number; y: number; v: number; l: number }[] = [];
  let flakes: { x: number; y: number; r: number; p: number }[] = [];
  let stones: { x: number; y: number; vy: number; floor: number; bounced: boolean }[] = [];
  let leaves: { x: number; y: number; a: number; v: number; p: number }[] = [];
  let flies: { x: number; y: number; p: number; q: number }[] = [];
  const ripples: { x: number; y: number; r: number; a: number }[] = [];

  /** Scatter everything over the scene at its current size. */
  function populate() {
    const { w, h, oy } = L;
    area = (w * h) / (360 * 440);
    across = w / 360;
    stars = many(70 * across, () => ({ x: rand(4, w - 4), y: rand(4, oy + 240), r: rand(0.5, 1.6), p: rand(0, 6) }));
    clouds = many(11 * across, () => ({ x: rand(-60, w + 20), y: rand(Math.max(10, oy - 40), oy + 190), s: rand(0.7, 1.5), v: rand(0.6, 1.4) }));
    drops = many(460 * area, () => ({ x: rand(-40, w + 40), y: rand(-h, h), v: rand(9, 14), l: rand(0.8, 1.2) }));
    flakes = many(400 * area, () => ({ x: rand(0, w), y: rand(-h, h), r: rand(1, 3.2), p: rand(0, 6) }));
    stones = many(70 * area, () => ({ x: rand(0, w), y: rand(-h, 0), vy: rand(6, 9), floor: rand(oy + 398, Math.max(oy + 400, h - 6)), bounced: false }));
    leaves = many(22 * area, () => ({ x: rand(0, w + 20), y: rand(-h, h), a: rand(0, 6), v: rand(0.5, 1.1), p: rand(0, 6) }));
    flies = many(24 * across, () => ({ x: rand(20, w - 20), y: rand(oy + 250, oy + 395), p: rand(0, 6), q: rand(0, 6) }));
    ripples.length = 0;
  }
  populate();

  function paintSky(p: SceneInputs, h: number) {
    const day = clamp(h * 4 + 0.15, 0, 1);
    const dusk = clamp(1 - Math.abs(h) * 5, 0, 1);
    const cl = p.cloud / 100;
    const fog = p.fog / 100;
    const smoke = clamp(p.aqi - 50, 0, 250) / 250;
    let t = mix([3, 20, 14], [15, 122, 82], day);
    let b = mix([10, 58, 44], [47, 177, 117], day);
    b = mix(b, [227, 155, 45], dusk * 0.75 * (1 - cl));
    t = mix(t, [14, 59, 51], dusk * 0.4);
    const grey = mix([18, 28, 25], [96, 112, 105], day);
    const overcast = cl * 0.55 + (clamp(p.rain, 0, 8) / 8) * 0.25 + (p.snow > 0 ? 0.15 : 0);
    t = mix(t, grey, overcast);
    b = mix(b, grey, overcast);
    if (p.thunder) {
      t = mix(t, [20, 28, 25], 0.55);
      b = mix(b, [30, 40, 36], 0.5);
    }
    const fogColour = mix([36, 48, 44], [188, 198, 193], day);
    t = mix(t, fogColour, fog * 0.7);
    b = mix(b, fogColour, fog * 0.8);
    const smokeColour = mix([52, 36, 24], [184, 134, 84], day);
    t = mix(t, smokeColour, smoke * 0.6);
    b = mix(b, smokeColour, smoke * 0.7);
    if (p.snow > 0) {
      t = mix(t, [205, 214, 210], (p.snow / 5) * 0.3 * day);
      b = mix(b, [215, 222, 218], (p.snow / 5) * 0.35 * day);
    }
    top = t;
    // The warm glow sits on the horizon, just above the hills.
    const css = `linear-gradient(to bottom, ${rgba(t)}, ${rgba(b)} ${Math.round((L.oy + 330) * L.scale)}px)`;
    if (css !== lastSky) {
      skyEl.style.background = css;
      lastSky = css;
    }
    return { day, dusk, cl, fog, smoke };
  }

  function drawMoon(x: number, y: number, r: number, phase: number, alpha: number) {
    const waxing = phase < 0.5;
    const k = Math.cos(2 * Math.PI * phase);
    const dark = rgba(mix(top, [255, 255, 255], 0.08));
    bk.save();
    bk.globalAlpha = alpha;
    bk.fillStyle = dark;
    bk.beginPath();
    bk.arc(x, y, r, 0, Math.PI * 2);
    bk.fill();
    bk.fillStyle = "#FFF1B8";
    bk.beginPath();
    bk.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
    bk.fill();
    bk.fillStyle = k > 0 ? dark : "#FFF1B8";
    bk.beginPath();
    bk.ellipse(x, y, r * Math.abs(k), r, 0, 0, Math.PI * 2);
    bk.fill();
    bk.restore();
  }

  function drawCloud(x: number, y: number, s: number, colour: RGB) {
    bk.fillStyle = rgba(colour, 0.9);
    for (const [dx, dy, rx, ry] of [[0, 0, 34, 14], [-14, -7, 16, 13], [13, -9, 19, 16], [30, -2, 15, 11]]) {
      bk.beginPath();
      bk.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      bk.fill();
    }
  }

  function draw(ms: number, move: boolean) {
    if (!target || !cur) return;
    if (move) for (const k of EASED) cur[k] += (target[k] - cur[k]) * 0.04;
    else for (const k of EASED) cur[k] = target[k];
    const p = { ...target, ...Object.fromEntries(EASED.map((k) => [k, cur![k]])) } as SceneInputs;
    const T = ms / 1000;
    const { w: W, h: H, ox, oy, open } = L;
    const h = sunHeight(p);
    const s = paintSky(p, h);
    const night = 1 - s.day;
    const wind = p.wind;
    const wx = wind * 0.06;
    const step = move ? 1 : 0;
    bk.clearRect(0, 0, W, H);
    fr.clearRect(0, 0, W, H);

    // Stars, then the sun or the moon on its arc.
    const starAlpha = night * (1 - s.cl) * (1 - s.fog) * (1 - s.smoke * 0.8);
    if (starAlpha > 0.01) {
      for (const st of stars) {
        bk.fillStyle = `rgba(255,241,184,${starAlpha * (0.5 + 0.5 * Math.sin(T * 2 + st.p))})`;
        bk.beginPath();
        bk.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        bk.fill();
      }
    }
    const x = 40 + (open - 80) * arcPosition(p);
    const y = oy + 230 - 190 * Math.abs(h);
    if (h > -0.05) {
      const alpha = clamp((1 - s.cl * 0.9) * (1 - s.fog * 0.7), 0, 1) * clamp(h * 10 + 0.5, 0, 1);
      const colour: RGB = p.aqi > 150 ? [226, 96, 58] : mix([246, 215, 122], [240, 140, 60], s.dusk);
      const glow = bk.createRadialGradient(x, y, 4, x, y, 70);
      glow.addColorStop(0, rgba(colour, 0.55 * alpha));
      glow.addColorStop(1, rgba(colour, 0));
      bk.fillStyle = glow;
      bk.fillRect(x - 70, y - 70, 140, 140);
      if (alpha > 0.3 && s.day > 0.6 && s.smoke < 0.3) {
        bk.save();
        bk.translate(x, y);
        bk.rotate(T * 0.05);
        bk.fillStyle = rgba([246, 215, 122], 0.12 * alpha);
        for (let r = 0; r < 16; r++) {
          bk.rotate(Math.PI / 8);
          bk.beginPath();
          bk.moveTo(0, 0);
          bk.lineTo(-4, -150);
          bk.lineTo(4, -150);
          bk.fill();
        }
        bk.restore();
      }
      bk.fillStyle = rgba(colour, alpha);
      bk.beginPath();
      bk.arc(x, y, 16, 0, Math.PI * 2);
      bk.fill();
    } else {
      drawMoon(x, y, 15, p.moon, clamp(night * (1 - s.cl * 0.85) * (1 - s.fog * 0.7), 0, 1));
    }

    // A rainbow when the sun comes out right after rain.
    if (p.rainJustStopped && h > 0.03 && s.cl < 0.8 && p.rain < 0.3) {
      bk.lineWidth = 7;
      const bands: [number, RGB][] = [[165, [168, 50, 45]], [158, [227, 155, 45]], [151, [246, 215, 122]], [144, [47, 177, 117]], [137, [31, 95, 122]]];
      for (const [r, c] of bands) {
        bk.strokeStyle = rgba(c, 0.45 * (1 - s.fog));
        bk.beginPath();
        bk.arc(ox + 180, oy + 420, r, Math.PI, 0);
        bk.stroke();
      }
    }

    // Clouds: how many from cloud cover, how dark from rain and thunder, how fast from wind.
    const darkness = clamp(p.rain / 6 + (p.thunder ? 0.55 : 0) + (p.snow > 0 ? 0.15 : 0), 0, 0.85);
    const cloudColour = mix(mix([236, 240, 238], [70, 82, 78], darkness), [40, 52, 48], night * 0.7);
    for (let i = 0; i < Math.round(s.cl * clouds.length); i++) {
      const c = clouds[i];
      c.x += (0.04 + wind * 0.018) * c.v * step;
      if (c.x > W + 60) c.x = -80;
      drawCloud(c.x, c.y, c.s, cloudColour);
    }

    // Lightning: a bolt and a soft flash every few seconds, never rapid.
    if (p.thunder && move && T > nextBolt) {
      nextBolt = T + rand(4, 9);
      flash = 0.4;
      const pts: [number, number][] = [[rand(40, open - 40), oy + 60]];
      while (pts[pts.length - 1][1] < oy + 330) {
        const [lx, ly] = pts[pts.length - 1];
        pts.push([lx + rand(-22, 22), ly + rand(18, 34)]);
      }
      bolt = { pts, until: T + 0.18 };
    }
    if (bolt && T < bolt.until) {
      bk.strokeStyle = "#FFF6D0";
      bk.lineWidth = 2.6;
      bk.beginPath();
      bolt.pts.forEach(([px, py], j) => (j ? bk.lineTo(px, py) : bk.moveTo(px, py)));
      bk.stroke();
    }

    const freezing = p.freezing || p.tempF <= 32;
    const frozenWater = p.tempF <= 20;

    // Rain: drizzle is short, faint and slow; heavy rain is long and dense. Wind slants it.
    if (p.rain > 0) {
      const count = Math.min(drops.length, Math.floor((30 + p.rain * 42) * area));
      const drizzle = p.rain < 0.5;
      const len = drizzle ? 6 : 10 + p.rain * 1.4;
      fr.strokeStyle = freezing ? "rgba(222,243,255,.75)" : drizzle ? "rgba(207,227,236,.35)" : "rgba(207,227,236,.6)";
      fr.lineWidth = drizzle ? 0.8 : 1.2;
      fr.beginPath();
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        const v = d.v * (drizzle ? 0.55 : 1);
        d.y += v * step;
        d.x += wx * 2 * step;
        if (d.y > H) {
          if (!frozenWater && Math.random() < 0.25) ripples.push({ x: d.x, y: rand(oy + 400, H - 4), r: 1, a: 0.6 });
          d.y = rand(-60, 0);
          d.x = rand(-60, W + 40);
        }
        fr.moveTo(d.x, d.y);
        fr.lineTo(d.x - (wx * 2 * len) / v, d.y - len * d.l);
      }
      fr.stroke();
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 0.5 * step;
      r.a -= 0.02 * step;
      if (r.a <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      fr.strokeStyle = `rgba(205,230,240,${r.a})`;
      fr.lineWidth = 1;
      fr.beginPath();
      fr.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, Math.PI * 2);
      fr.stroke();
    }

    if (p.snow > 0) {
      const count = Math.min(flakes.length, Math.floor((25 + p.snow * 72) * area));
      fr.fillStyle = "rgba(255,255,255,.92)";
      for (let i = 0; i < count; i++) {
        const f = flakes[i];
        f.y += (0.4 + f.r * 0.3 + p.snow * 0.06) * step;
        f.x += (Math.sin(T * 1.3 + f.p) * 0.4 + wx * 1.6) * step;
        if (f.y > H) {
          f.y = rand(-30, 0);
          f.x = rand(-40, W + 20);
        }
        if (f.x > W + 10) f.x = -10;
        fr.beginPath();
        fr.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        fr.fill();
      }
    }

    if (p.hail) {
      fr.fillStyle = "rgba(240,248,252,.95)";
      for (const st of stones) {
        st.y += st.vy * step;
        st.x += wx * step;
        if (st.y > st.floor && !st.bounced) {
          st.vy = -st.vy * 0.35;
          st.bounced = true;
        }
        if (st.bounced) st.vy += 0.5 * step;
        if (st.y > H || (st.bounced && st.vy > 0 && st.y > st.floor + 2)) {
          Object.assign(st, { y: rand(-80, 0), x: rand(0, W), vy: rand(6, 9), bounced: false });
        }
        fr.beginPath();
        fr.arc(st.x, st.y, 2.4, 0, Math.PI * 2);
        fr.fill();
      }
    }

    // Autumn leaves or spring blossoms, blown about by the wind.
    if ((p.season === "autumn" || p.season === "spring") && p.snow === 0 && p.rain < 3) {
      const colours = p.season === "autumn" ? ["#E39B2D", "#A8322D", "#C9A227", "#C77F1A"] : ["#F4C0D1", "#FBEAF0", "#ED93B1", "#FFFFFF"];
      const count = Math.min(leaves.length, Math.round((6 + wind / 3) * area));
      for (let i = 0; i < count; i++) {
        const l = leaves[i];
        l.y += l.v * step;
        l.x += (Math.sin(T + l.p) * 0.6 + wx * 2.2 - 0.2) * step;
        l.a += (0.03 + wind * 0.002) * step;
        if (l.y > H || l.x > W + 40 || l.x < -40) {
          l.y = rand(-40, -5);
          l.x = wind > 15 ? rand(-120, W * 0.55) : rand(0, W + 20);
        }
        fr.save();
        fr.translate(l.x, l.y);
        fr.rotate(l.a);
        fr.fillStyle = colours[i % 4];
        fr.beginPath();
        fr.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2);
        fr.fill();
        fr.restore();
      }
    }

    // Fireflies on warm, dry summer nights.
    if (p.season === "summer" && night > 0.6 && p.tempF > 60 && p.rain === 0 && p.snow === 0) {
      for (const q of flies) {
        const fx = q.x + Math.sin(T * 0.7 + q.p) * 18;
        const fy = q.y + Math.cos(T * 0.5 + q.q) * 10;
        const a = clamp(0.5 + 0.5 * Math.sin(T * 2.2 + q.p * 3), 0, 1);
        const g = fr.createRadialGradient(fx, fy, 0, fx, fy, 7);
        g.addColorStop(0, `rgba(246,226,122,${a})`);
        g.addColorStop(1, "rgba(246,226,122,0)");
        fr.fillStyle = g;
        fr.fillRect(fx - 7, fy - 7, 14, 14);
      }
    }

    // Heat shimmer over the hills on hot afternoons.
    if (p.tempF >= 88 && s.day > 0.5) {
      fr.strokeStyle = `rgba(255,236,200,${clamp((p.tempF - 88) / 20, 0, 0.22)})`;
      fr.lineWidth = 1.2;
      for (let band = 0; band < 5; band++) {
        fr.beginPath();
        for (let hx = 0; hx <= W; hx += 8) {
          const hy = oy + 322 + band * 11 + Math.sin(hx * 0.05 + T * 3 + band) * 2.2;
          if (hx) fr.lineTo(hx, hy);
          else fr.moveTo(hx, hy);
        }
        fr.stroke();
      }
    }

    // Fog drifts in bands; haze and smoke tint everything.
    if (p.fog > 0) {
      const fogColour = night > 0.5 ? "150,165,160" : "236,240,238";
      for (let band = 0; band < 6; band++) {
        const fy = oy + 170 + band * 42;
        const fx = ((T * (4 + wind * 0.6) * (1 + band * 0.15)) % (W + 200)) - 200;
        const g = fr.createLinearGradient(0, fy - 22, 0, fy + 22);
        g.addColorStop(0, `rgba(${fogColour},0)`);
        g.addColorStop(0.5, `rgba(${fogColour},${s.fog * 0.42})`);
        g.addColorStop(1, `rgba(${fogColour},0)`);
        fr.fillStyle = g;
        fr.fillRect(fx - 200, fy - 22, W + 400, 44);
      }
      fr.fillStyle = `rgba(${fogColour},${s.fog * 0.22})`;
      fr.fillRect(0, 0, W, H);
    }
    if (s.smoke > 0) {
      fr.fillStyle = `rgba(184,134,84,${s.smoke * 0.32})`;
      fr.fillRect(0, 0, W, H);
    }

    // Frost creeping in from the top corners at freezing.
    if (freezing) {
      for (const cx of [0, W]) {
        const g = fr.createRadialGradient(cx, 0, 0, cx, 0, 110);
        g.addColorStop(0, "rgba(220,240,250,.55)");
        g.addColorStop(1, "rgba(220,240,250,0)");
        fr.fillStyle = g;
        fr.fillRect(cx - 110, 0, 220, 110);
      }
    }

    if (flash > 0) {
      fr.fillStyle = `rgba(255,255,255,${flash})`;
      fr.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - 0.04);
    }
  }

  function loop(ms: number) {
    draw(ms, true);
    raf = requestAnimationFrame(loop);
  }

  return {
    /** Size the canvases for the screen, kept sharp on high-density screens. */
    resize(next: SceneLayout) {
      const moved = Math.abs(next.w - L.w) > 1 || Math.abs(next.h - L.h) > 1 || Math.abs(next.oy - L.oy) > 1;
      L = next;
      if (moved) populate();
      lastSky = "";
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const [canvas, ctx] of [[back, bk], [front, fr]] as const) {
        canvas.width = Math.round(L.w * L.scale * dpr);
        canvas.height = Math.round(L.h * L.scale * dpr);
        ctx.setTransform(L.scale * dpr, 0, 0, L.scale * dpr, 0, 0);
      }
      if (still) draw(performance.now(), false);
    },
    set(next: SceneInputs) {
      target = next;
      cur ??= { ...next };
      if (still) draw(performance.now(), false);
    },
    /** Animate, or for people who ask for less motion, draw one still picture. */
    start(reducedMotion: boolean) {
      still = reducedMotion;
      if (still) draw(performance.now(), false);
      else raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
