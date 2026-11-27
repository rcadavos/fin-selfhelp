/**
 * Shared pieces for images drawn with `next/og` (Satori): the link-preview image
 * and the Facebook cover and profile picture in /admin/settings. Server-only:
 * it reads files from `public/`.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* ============================================================
   Passbook design tokens (light) — mirrors globals.css :root.
   One green ink, hairline rules, banking-grade mono numerals.
   ============================================================ */
export const PAPER = "#F7F8F6"; // --background
export const CARD = "#FCFDFB"; // --card surface
export const INK = "#171D19"; // --foreground
export const MUTED = "#5A6660"; // --muted-foreground
export const GREEN = "#0B6E4F"; // --primary money green
export const BORDER = "#E2E7E2"; // --border hairline
export const HAIR_STRONG = "#C9D2CB"; // --hairline-strong
export const AMBER = "#8A6116"; // --warning amber ink (Due)
export const RED = "#B3372F"; // --destructive (Overdue)
export const BLUE = "#1F62B0"; // --info (Auto-debit)
export const TINT = "#F3F7F4"; // --primary at 4% on the card: the dashboard's second figure
export const LEADER = "rgba(90,102,96,0.45)"; // dot-leader ink

export const MONO = "Geist Mono";
export const SANS = "Schibsted Grotesk";

/** Large-print status pill, as on the dashboard: plain words on a soft tint. */
export const PILL = {
  overdue: { color: RED, background: "#FBEDEB" },
  due: { color: AMBER, background: "#FBF3E2" },
  scheduled: { color: BLUE, background: "#E8F0FA" },
} as const;

/** Every glyph the brand images render — sent to Google Fonts so it returns a
 *  subsetted TTF (Satori can't parse the woff2 you'd otherwise get). Includes
 *  both cases so `text-transform: uppercase` can't produce tofu. */
export const BRAND_GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/-–—•₱→%&()'?!";

type FontSpec = { name: string; family: string; weight: 400 | 500 | 700 };

const FONT_SPECS: FontSpec[] = [
  { name: SANS, family: SANS, weight: 400 },
  { name: SANS, family: SANS, weight: 500 },
  { name: SANS, family: SANS, weight: 700 },
  { name: MONO, family: MONO, weight: 400 },
  { name: MONO, family: MONO, weight: 500 },
];

export type BrandFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontSpec["weight"];
  style: "normal";
};

/** Fetch a single Google Font weight as a TTF ArrayBuffer, subset to `glyphs`.
 *  Returns null on any failure so the image still renders on next/og's
 *  bundled default font rather than failing the build. */
async function loadGoogleFont(spec: FontSpec, glyphs: string): Promise<BrandFont | null> {
  try {
    const family = spec.family.replace(/ /g, "+");
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${spec.weight}&text=${encodeURIComponent(glyphs)}`;
    const cssRes = await fetch(url);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const src = css.match(
      /src:\s*url\(([^)]+)\)\s*format\(['"]?(?:opentype|truetype)['"]?\)/,
    )?.[1];
    if (!src) return null;
    const fontRes = await fetch(src);
    if (!fontRes.ok) return null;
    return {
      name: spec.name,
      data: await fontRes.arrayBuffer(),
      weight: spec.weight,
      style: "normal",
    };
  } catch {
    return null;
  }
}

/** The brand's sans and mono weights, skipping any that fail to load. */
export async function loadBrandFonts(glyphs: string = BRAND_GLYPHS): Promise<BrandFont[]> {
  const results = await Promise.all(FONT_SPECS.map((spec) => loadGoogleFont(spec, glyphs)));
  return results.filter((f): f is BrandFont => f !== null);
}

/** Otto's face (`public/icons/otto-512.png`) as a data URL Satori can draw. */
export async function loadOttoFaceDataUrl(): Promise<string> {
  const buffer = await readFile(join(process.cwd(), "public", "icons", "otto-512.png"));
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
