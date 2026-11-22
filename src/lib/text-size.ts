import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_OPTIONS,
  TEXT_SIZE_STORAGE_KEY,
  type TextSizeId,
} from "@/lib/constants/text-size";

/**
 * Text size is applied as the root (`<html>`) font size. Tailwind sizes text,
 * spacing and controls in rem, so the whole app scales together and nothing is
 * left too small for the text inside it.
 */

/** The root font size for an option, or "" for the default (the browser's own size). */
function rootFontSize(id: TextSizeId): string {
  const scale = TEXT_SIZE_OPTIONS.find((o) => o.id === id)?.scale ?? 1;
  return scale === 1 ? "" : `${scale * 100}%`;
}

export function isTextSizeId(value: unknown): value is TextSizeId {
  return TEXT_SIZE_OPTIONS.some((o) => o.id === value);
}

export function readStoredTextSize(): TextSizeId {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSizeId(stored) ? stored : DEFAULT_TEXT_SIZE;
  } catch {
    return DEFAULT_TEXT_SIZE;
  }
}

export function storeTextSize(id: TextSizeId): void {
  try {
    if (id === DEFAULT_TEXT_SIZE) localStorage.removeItem(TEXT_SIZE_STORAGE_KEY);
    else localStorage.setItem(TEXT_SIZE_STORAGE_KEY, id);
  } catch {
    // Storage blocked (private mode): the size still applies until the page reloads.
  }
}

export function applyTextSize(id: TextSizeId): void {
  document.documentElement.style.fontSize = rootFontSize(id);
}

const ROOT_FONT_SIZE_BY_ID = Object.fromEntries(
  TEXT_SIZE_OPTIONS.filter((o) => o.id !== DEFAULT_TEXT_SIZE).map((o) => [o.id, rootFontSize(o.id)])
);

/**
 * Puts the saved size on `<html>` on every full page load, before React hydrates.
 * The root layout runs it through `next/script` with `beforeInteractive`.
 */
export const TEXT_SIZE_INIT_SCRIPT = `(function(){try{var m=${JSON.stringify(
  ROOT_FONT_SIZE_BY_ID
)},v=localStorage.getItem(${JSON.stringify(
  TEXT_SIZE_STORAGE_KEY
)});if(v&&Object.prototype.hasOwnProperty.call(m,v))document.documentElement.style.fontSize=m[v];}catch(e){}})();`;
