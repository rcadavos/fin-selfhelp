/**
 * Icon buttons in the app's top bars (text size, theme, notifications), so the three
 * always match. The desktop toolbar has room for bigger targets. The phone header and
 * the public pages' headers are tight rows, so they keep the compact size.
 */
export const TOP_BAR_ICON_BUTTON = {
  default: { button: "size-8", icon: "size-4", badge: "-right-1 -top-1" },
  /** `badge` sits in the corner so the unread count still overlaps the bell. */
  lg: { button: "size-10", icon: "size-5", badge: "right-0 top-0" },
} as const;

export type TopBarIconButtonSize = keyof typeof TOP_BAR_ICON_BUTTON;

/**
 * Placeholders for the header search. Search only jumps to pages (see `SEARCH_INDEX`),
 * so they name pages, calculators and settings, never bills or expenses themselves.
 * The phone header has less room, so it gets the shorter one.
 */
export const APP_SEARCH_PLACEHOLDER = {
  desktop: "Search pages, calculators, settings…",
  mobile: "Search pages & settings…",
} as const;
