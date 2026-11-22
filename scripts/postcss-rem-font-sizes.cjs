/**
 * PostCSS plugin: rewrites px font sizes, line heights and letter spacing as rem.
 *
 * Text size (the Aa menu in the app header) works by changing the root font size,
 * and only sizes set in rem follow it. A lot of the UI sets small type in px:
 * Tailwind arbitrary values like `text-[11px]`, and `.eyebrow` and `.stamp` in
 * globals.css. Without this, those would stay small while the text around them grew.
 *
 * 1rem is 16px, so at the default text size nothing moves: 11px becomes 0.6875rem.
 * Only the properties below are touched, so borders, padding and media queries
 * stay in px.
 */
const PROPS = new Set(["font", "font-size", "line-height", "letter-spacing"]);
const ROOT_PX = 16;
/** A px length that is not part of a longer name, such as `--gap-12px`. */
const PX_LENGTH = /(?<![\w-])(-?\d*\.?\d+)px\b/g;

function toRem(_match, value) {
  return `${Number((Number(value) / ROOT_PX).toFixed(5))}rem`;
}

/** @type {import('postcss').PluginCreator<void>} */
module.exports = () => ({
  postcssPlugin: "omnitrak-rem-font-sizes",
  Declaration(decl) {
    if (!PROPS.has(decl.prop) || !decl.value.includes("px")) return;
    decl.value = decl.value.replace(PX_LENGTH, toRem);
  },
});
module.exports.postcss = true;
