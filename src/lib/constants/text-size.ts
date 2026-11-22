/** The text sizes offered by the Aa menu in the app header. */
export type TextSizeId = "sm" | "md" | "lg" | "xl";

export const DEFAULT_TEXT_SIZE: TextSizeId = "md";

/** Saved per device, like the light/dark theme. */
export const TEXT_SIZE_STORAGE_KEY = "omnitrak-text-size";

/**
 * `scale` multiplies the root font size, so everything set in rem grows with it
 * (px type is converted to rem at build time; see `scripts/postcss-rem-font-sizes.cjs`).
 * It is a share of the browser's own default size, so someone who already set
 * larger text in their browser keeps that on top.
 * `glyphClass` is the size of the "A" that stands for each option in the menu.
 */
export const TEXT_SIZE_OPTIONS: {
  id: TextSizeId;
  label: string;
  scale: number;
  glyphClass: string;
}[] = [
  { id: "sm", label: "Small", scale: 0.875, glyphClass: "text-xs" },
  { id: "md", label: "Default", scale: 1, glyphClass: "text-sm" },
  { id: "lg", label: "Large", scale: 1.125, glyphClass: "text-base" },
  { id: "xl", label: "Extra large", scale: 1.25, glyphClass: "text-lg" },
];
