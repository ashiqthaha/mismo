// Draws the app icons (the shamrock-lotus on Irish green) into public/icons. Run: node scripts/make-icons.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const GREEN = "#0b5d41";
const IVORY = "#fbf7ef";
const SAFFRON = "#e39b2d";

// Three leaves and a saffron centre, the same mark as the header, centred on the 512 square.
const shamrock = (leaf, centre) =>
  `<g transform="translate(116 104) scale(14)"><circle cx="10" cy="5" r="5" fill="${leaf}"/><circle cx="4.5" cy="13" r="5" fill="${leaf}"/><circle cx="15.5" cy="13" r="5" fill="${leaf}"/>${centre ? `<circle cx="10" cy="10.5" r="2.6" fill="${centre}"/>` : ""}</g>`;

// A henna-style row of saffron arches and dots along the bottom.
const arches = () => {
  let d = "M64 420";
  for (let x = 64; x < 448; x += 48) d += ` Q${x + 24} 456 ${x + 48} 420`;
  const dots = Array.from({ length: 8 }, (_, i) => `<circle cx="${88 + i * 48}" cy="452" r="6" fill="${IVORY}"/>`).join("");
  return `<path d="${d}" fill="none" stroke="${SAFFRON}" stroke-width="9" stroke-linecap="round"/>${dots}`;
};

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${GREEN}"/>${shamrock(IVORY, SAFFRON)}${arches()}</svg>`;
// Maskable icons get cropped to a circle or squircle, so fill the whole square and keep the mark small.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${GREEN}"/><g transform="translate(64 64) scale(0.75)">${shamrock(IVORY, SAFFRON)}${arches()}</g></svg>`;
// The notification badge is a one-colour silhouette.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(0 20)">${shamrock("#000")}</g></svg>`;

mkdirSync("public/icons", { recursive: true });
await sharp(Buffer.from(rounded)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(rounded)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(Buffer.from(maskable)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(badge)).resize(96, 96).png().toFile("public/icons/badge-96.png");
console.log("icons written to public/icons");
