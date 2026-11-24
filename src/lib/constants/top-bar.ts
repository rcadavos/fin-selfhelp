/**
 * Icon buttons in the app's top bars (text size, theme, notifications), so the three
 * always match. The desktop toolbar has room for bigger targets. The phone header is a
 * tight row, so it keeps the compact size. The home page header is compact on phones
 * and tablets, and matches the desktop toolbar from `lg` up.
 */
export const TOP_BAR_ICON_BUTTON = {
  default: { button: "size-8", icon: "size-4", badge: "-right-1 -top-1" },
  /** `badge` sits in the corner so the unread count still overlaps the bell. */
  lg: { button: "size-11", icon: "size-6", badge: "right-0 top-0" },
  /** `default` below the `lg` breakpoint, `lg` from it up. */
  responsive: {
    button: "size-8 lg:size-11",
    icon: "size-4 lg:size-6",
    badge: "-right-1 -top-1 lg:right-0 lg:top-0",
  },
} as const;

export type TopBarIconButtonSize = keyof typeof TOP_BAR_ICON_BUTTON;

/** Height of the desktop app toolbar, shared with the sidebar's logo row so their borders line up. */
export const APP_TOOLBAR_HEIGHT_CLASS = "h-16";

/**
 * Placeholders for the header search. Search only jumps to pages (see `SEARCH_INDEX`),
 * so they name pages, calculators and settings, never bills or expenses themselves.
 * The phone header has less room, so it gets the shorter one.
 */
export const APP_SEARCH_PLACEHOLDER = {
  desktop: "Search pages, calculators, settings…",
  mobile: "Search pages & settings…",
} as const;
