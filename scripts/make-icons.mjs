// Draws the app icons (a white house on teal) into public/icons. Run: node scripts/make-icons.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const house = (stroke) =>
  `<path d="M256 136 L392 246 V384 H300 V300 H212 V384 H120 V246 Z" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f766e"/>${house(34)}</svg>`;
// Maskable icons get cropped to a circle or squircle, so fill the whole square and keep the house small.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f766e"/><g transform="translate(51 51) scale(0.8)">${house(40)}</g></svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${house(48).replace("#fff", "#000")}</svg>`;

mkdirSync("public/icons", { recursive: true });
await sharp(Buffer.from(rounded)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(rounded)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(Buffer.from(maskable)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(badge)).resize(96, 96).png().toFile("public/icons/badge-96.png");
console.log("icons written to public/icons");
