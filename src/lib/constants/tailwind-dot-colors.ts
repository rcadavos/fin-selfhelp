export const TAILWIND_DOT_COLORS: Record<string, string> = {
    amber: "#f59e0b",
    sky: "#0ea5e9",
    slate: "#64748b",
    emerald: "#10b981",
    rose: "#f43f5e",
    green: "#22c55e",
    violet: "#8b5cf6",
    orange: "#f97316",
    teal: "#14b8a6",
    indigo: "#6366f1",
    fuchsia: "#d946ef",
    lime: "#84cc16",
    cyan: "#06b6d4",
    red: "#ef4444",
    blue: "#3b82f6",
    pink: "#ec4899",
    yellow: "#eab308",
    purple: "#a855f7",
} as const;

/** Slate, for a category whose class names no colour on the list. */
const FALLBACK_DOT_COLOR = "#94a3b8";

/** A category's dot colour, read from its light background class ("bg-amber-50 …" → amber). */
export function categoryDotColor(bgClass: string | null | undefined): string {
    const match = (bgClass ?? "").match(/bg-(\w+)-\d+/);
    return (match && TAILWIND_DOT_COLORS[match[1]]) ?? FALLBACK_DOT_COLOR;
}