import type { SVGProps } from "react";
import type { Bird } from "@/lib/db/schema";

// The owl and the cardinal, drawn in the manner of Gond folk art from central
// India: solid shapes filled with rows of dots and lines. They're part of the
// look for everyone, and each person picks one to mark what they add.

export const BIRDS: Record<Bird, string> = { owl: "Owl", cardinal: "Cardinal" };

export function Owl(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 110" aria-hidden {...props}>
      <path d="M24 38 L18 12 L42 30Z M76 38 L82 12 L58 30Z" fill="#0B6E4F" />
      <ellipse cx="50" cy="62" rx="32" ry="40" fill="#0B6E4F" />
      <path d="M18 58 Q6 80 24 98 Q21 76 30 62Z M82 58 Q94 80 76 98 Q79 76 70 62Z" fill="#0B5D41" />
      <ellipse cx="50" cy="62" rx="27" ry="35" fill="none" stroke="#FBF7EF" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 5.5" />
      <ellipse cx="50" cy="77" rx="16" ry="20" fill="#FBF7EF" />
      <path d="M38 70 q6 6 12 0 q6 6 12 0 M38 79 q6 6 12 0 q6 6 12 0 M40 88 q5 5 10 0 q5 5 10 0" fill="none" stroke="#169B62" strokeWidth="2" />
      <circle cx="37" cy="44" r="13" fill="#FBF7EF" />
      <circle cx="63" cy="44" r="13" fill="#FBF7EF" />
      <circle cx="37" cy="44" r="8" fill="#E39B2D" />
      <circle cx="63" cy="44" r="8" fill="#E39B2D" />
      <circle cx="37" cy="44" r="3.8" fill="#1F2A24" />
      <circle cx="63" cy="44" r="3.8" fill="#1F2A24" />
      <path d="M46 53 L54 53 L50 61Z" fill="#E39B2D" />
      <path d="M40 101 v7 M46 102 v7 M54 102 v7 M60 101 v7" stroke="#E39B2D" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Cardinal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 95" aria-hidden {...props}>
      <path d="M68 50 L114 66 L108 80 L64 64Z" fill="#8E2420" />
      <path d="M76 59 L108 71 M74 63 L104 76" stroke="#F3C9C2" strokeWidth="1.5" />
      <ellipse cx="52" cy="54" rx="28" ry="22" fill="#B8322A" />
      <circle cx="35" cy="36" r="15" fill="#B8322A" />
      <path d="M28 25 L36 3 L46 26Z" fill="#B8322A" />
      <path d="M18 33 Q27 27 33 35 Q29 45 19 42Z" fill="#1F2A24" />
      <path d="M10 38 L23 32 L23 44Z" fill="#E39B2D" />
      <circle cx="34" cy="31" r="2.4" fill="#FBF7EF" />
      <path d="M42 50 Q66 38 84 58 Q62 66 42 50Z" fill="#8E2420" />
      <path d="M50 52 Q64 46 76 57 M48 56 Q62 54 72 60" fill="none" stroke="#F3C9C2" strokeWidth="1.5" strokeDasharray="3 3" />
      <ellipse cx="44" cy="62" rx="14" ry="9" fill="none" stroke="#FBF7EF" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 5" />
      <path d="M46 74 v12 M56 74 v12" stroke="#5B3A1E" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function BirdPicture({ bird, ...props }: { bird: Bird } & SVGProps<SVGSVGElement>) {
  return bird === "owl" ? <Owl {...props} /> : <Cardinal {...props} />;
}

/** The logo: three shamrock leaves that also read as a lotus, with a saffron centre. Leaves take the text colour. */
export function Shamrock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden {...props}>
      <g fill="currentColor">
        <circle cx="10" cy="5" r="5" />
        <circle cx="4.5" cy="13" r="5" />
        <circle cx="15.5" cy="13" r="5" />
      </g>
      <circle cx="10" cy="10.5" r="2.6" fill="#E39B2D" />
    </svg>
  );
}

/** Both birds perched on a branch with shamrock leaves. */
export function BirdsOnBranch(props: SVGProps<SVGSVGElement>) {
  const leaf = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s / 20})`}>
      <circle cx="10" cy="5" r="5" fill="#169B62" />
      <circle cx="4.5" cy="13" r="5" fill="#169B62" />
      <circle cx="15.5" cy="13" r="5" fill="#169B62" />
      <circle cx="10" cy="11" r="1.6" fill="#E39B2D" />
    </g>
  );
  return (
    <svg viewBox="0 0 264 140" aria-hidden {...props}>
      <path d="M0 128 Q90 108 170 121 T264 110" stroke="#5B3A1E" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M120 116 Q132 96 150 92 M220 116 Q232 98 250 96" stroke="#5B3A1E" strokeWidth="3" fill="none" strokeLinecap="round" />
      {leaf(140, 80, 18)}
      {leaf(242, 84, 18)}
      {leaf(10, 110, 16)}
      {leaf(128, 104, 14)}
      {leaf(230, 100, 14)}
      <Owl x="40" y="28" width="80" height="88" />
      <Cardinal x="152" y="60" width="78" height="62" />
    </svg>
  );
}

/** A faint eight-petal mandala for the corner of a card. Takes the text colour. */
export function Mandala(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-50 -50 100 100" aria-hidden {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle r="12" />
        <circle r="40" strokeDasharray="0.1 6" strokeLinecap="round" strokeWidth="3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <ellipse key={deg} cy="-24" rx="7" ry="13" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Whose this is: their bird in a small circle, or the first letter of their
 * name if they haven't picked one. The name shows on hover and to screen readers.
 */
export function BirdBadge({ bird, name, size = "sm" }: { bird?: Bird | null; name?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "md" ? "h-8 w-8" : "h-6 w-6";
  if (!bird) {
    if (!name) return null;
    return (
      <span title={name} role="img" aria-label={name} className={`${box} inline-grid shrink-0 place-items-center rounded-full bg-sand-100 text-[11px] font-semibold text-sand-600 ring-1 ring-sand-200`}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const label = name ? `${name} (${BIRDS[bird].toLowerCase()})` : BIRDS[bird];
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className={`${box} inline-grid shrink-0 place-items-center rounded-full ring-1 ${bird === "owl" ? "bg-brand-50 ring-brand-200" : "bg-sindoor-50 ring-sindoor-200"}`}
    >
      <BirdPicture bird={bird} className={bird === "owl" ? "h-[74%] w-[74%]" : "h-[80%] w-[80%]"} />
    </span>
  );
}
