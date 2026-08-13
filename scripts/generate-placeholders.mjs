/**
 * Generates line-art SVG placeholders for the seeded catalogue.
 *
 * These exist so the storefront looks like a real jewellery store before any
 * photography is uploaded. Once the admin uploads real images through the media
 * library, Cloudinary URLs replace these and this script is no longer used.
 *
 *   node scripts/generate-placeholders.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../public/placeholders");

const W = 1200;
const H = 1500;
const CX = W / 2;
const CY = H / 2 - 40;

// Warm sand grounds, rotated per image so a grid of products is not monotonous.
const GROUNDS = ["#f4f1ec", "#faf8f5", "#eeeae2", "#f2f0ea"];
const INK = "#244b47";
const GOLD = "#c29438";

/** Drawing routines per category. Each returns SVG markup for the artwork. */
const ART = {
  ring: (s) => `
    <ellipse cx="${CX}" cy="${CY + 40}" rx="${150 * s}" ry="${160 * s}"
             fill="none" stroke="${INK}" stroke-width="10"/>
    <ellipse cx="${CX}" cy="${CY + 40}" rx="${118 * s}" ry="${128 * s}"
             fill="none" stroke="${INK}" stroke-width="4" opacity="0.35"/>
    <path d="M ${CX - 46} ${CY - 132} L ${CX} ${CY - 196} L ${CX + 46} ${CY - 132} L ${CX} ${CY - 92} Z"
          fill="none" stroke="${GOLD}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M ${CX - 46} ${CY - 132} L ${CX + 46} ${CY - 132}" stroke="${GOLD}" stroke-width="5" opacity="0.7"/>`,

  earring: (s) =>
    [-1, 1]
      .map((side) => {
        const x = CX + side * 130;
        return `
    <circle cx="${x}" cy="${CY - 170}" r="16" fill="none" stroke="${INK}" stroke-width="8"/>
    <path d="M ${x} ${CY - 154} L ${x} ${CY - 70}" stroke="${INK}" stroke-width="6"/>
    <path d="M ${x} ${CY - 70} q ${70 * s} ${90 * s} 0 ${190 * s} q ${-70 * s} ${-100 * s} 0 ${-190 * s} Z"
          fill="none" stroke="${GOLD}" stroke-width="9" stroke-linejoin="round"/>
    <circle cx="${x}" cy="${CY + 40}" r="12" fill="${GOLD}" opacity="0.5"/>`;
      })
      .join(""),

  // A quadratic curve's lowest point sits at half its control offset, not at
  // the control point itself. The pendant hangs from that computed apex so the
  // drop always touches the chain regardless of `s`.
  necklace: (s) => {
    const drop = 430 * s;
    const apex = CY - 220 + drop / 2;
    return `
    <path d="M ${CX - 300} ${CY - 220} q ${300} ${drop} ${600} 0"
          fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M ${CX - 262} ${CY - 218} q ${262} ${drop * 0.88} ${524} 0"
          fill="none" stroke="${INK}" stroke-width="4" opacity="0.3"/>
    <path d="M ${CX} ${apex} l 58 78 -58 88 -58 -88 Z"
          fill="none" stroke="${GOLD}" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="${CX}" cy="${apex + 78}" r="14" fill="${GOLD}" opacity="0.45"/>`;
  },

  pendant: (s) => `
    <path d="M ${CX - 190} ${CY - 250} q ${190} ${150} ${190} ${230}"
          fill="none" stroke="${INK}" stroke-width="7"/>
    <path d="M ${CX + 190} ${CY - 250} q ${-190} ${150} ${-190} ${230}"
          fill="none" stroke="${INK}" stroke-width="7"/>
    <circle cx="${CX}" cy="${CY + 90}" r="${112 * s}" fill="none" stroke="${GOLD}" stroke-width="11"/>
    <circle cx="${CX}" cy="${CY + 90}" r="${64 * s}" fill="none" stroke="${INK}" stroke-width="6" opacity="0.5"/>
    <circle cx="${CX}" cy="${CY + 90}" r="${20 * s}" fill="${GOLD}" opacity="0.55"/>`,

  bracelet: (s) => {
    const links = [];
    for (let i = 0; i < 7; i += 1) {
      const x = CX - 240 + i * 80;
      const y = CY + Math.sin(i * 0.9) * 26;
      links.push(
        `<rect x="${x - 34}" y="${y - 26}" width="68" height="52" rx="26"
               fill="none" stroke="${i % 2 ? GOLD : INK}" stroke-width="9"/>`,
      );
    }
    return links.join("");
  },

  bangle: (s) => `
    <circle cx="${CX}" cy="${CY + 30}" r="${210 * s}" fill="none" stroke="${INK}" stroke-width="14"/>
    <circle cx="${CX}" cy="${CY + 30}" r="${168 * s}" fill="none" stroke="${INK}" stroke-width="5" opacity="0.3"/>
    <circle cx="${CX}" cy="${CY + 30}" r="${228 * s}" fill="none" stroke="${GOLD}" stroke-width="5" opacity="0.6"
            stroke-dasharray="14 22"/>`,

  anklet: (s) => {
    const drop = 260 * s;
    // Solve the curve for each charm's x so every charm sits ON the chain
    // rather than on a straight line beneath it.
    const charmY = (x) => {
      const t = (x - (CX - 300)) / 600;
      return CY - 40 + 2 * t * (1 - t) * drop;
    };
    const charms = [-2, -1, 0, 1, 2]
      .map((i) => {
        const x = CX + i * 78;
        return `<circle cx="${x}" cy="${charmY(x) + 22}" r="15"
                   fill="none" stroke="${GOLD}" stroke-width="8"/>`;
      })
      .join("");
    return `
    <path d="M ${CX - 300} ${CY - 40} q ${300} ${drop} ${600} 0"
          fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    ${charms}`;
  },

  chain: (s) => {
    const links = [];
    for (let i = 0; i < 9; i += 1) {
      const y = CY - 300 + i * 76;
      const horizontal = i % 2 === 0;
      links.push(
        `<ellipse cx="${CX}" cy="${y}" rx="${horizontal ? 44 : 26}" ry="${horizontal ? 26 : 44}"
                  fill="none" stroke="${horizontal ? INK : GOLD}" stroke-width="9"/>`,
      );
    }
    return links.join("");
  },

  set: (s) => `
    <path d="M ${CX - 250} ${CY - 260} q ${250} ${330 * s} ${500} 0"
          fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <path d="M ${CX} ${CY - 260 + (330 * s) / 2} l 46 62 -46 70 -46 -70 Z"
          fill="none" stroke="${GOLD}" stroke-width="9" stroke-linejoin="round"/>
    ${[-1, 1]
      .map(
        (side) => `
    <circle cx="${CX + side * 250}" cy="${CY + 230}" r="14" fill="none" stroke="${INK}" stroke-width="7"/>
    <path d="M ${CX + side * 250} ${CY + 244} q ${44} ${56} 0 ${118} q ${-44} ${-62} 0 ${-118} Z"
          fill="none" stroke="${GOLD}" stroke-width="8"/>`,
      )
      .join("")}`,
};

function svg(kind, index) {
  const ground = GROUNDS[index % GROUNDS.length];
  // Gentle scale variation keeps a product grid from looking stamped.
  const scale = 0.9 + ((index * 7) % 5) * 0.05;
  const artwork = ART[kind](scale);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${kind} placeholder">
  <rect width="${W}" height="${H}" fill="${ground}"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.28"/>
  <g stroke-linecap="round">${artwork}</g>
  <text x="${CX}" y="${H - 108}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="34"
        letter-spacing="9" fill="${INK}" opacity="0.5">AASTHA</text>
  <text x="${CX}" y="${H - 74}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="17"
        letter-spacing="6" fill="${INK}" opacity="0.32">SILVER &amp; JEWELS</text>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });

let written = 0;
for (const kind of Object.keys(ART)) {
  for (let i = 1; i <= 4; i += 1) {
    writeFileSync(resolve(outDir, `${kind}-${i}.svg`), svg(kind, i));
    written += 1;
  }
}

console.log(`Generated ${written} placeholder images in public/placeholders/`);
