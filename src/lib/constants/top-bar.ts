/**
 * Icon buttons in the app's top bars (text size, theme, notifications), so the three
 * always match. The desktop toolbar has room for bigger targets. The phone header and
 * the public pages' headers are tight rows, so they keep the compact size.
 */
export const TOP_BAR_ICON_BUTTON = {
  default: { button: "size-8", icon: "size-4", badge: "-right-0.5 -top-0.5" },
  /** `badge` comes in from the corner so the unread count still sits on the bell. */
  lg: { button: "size-10", icon: "size-5", badge: "right-0.5 top-0.5" },
} as const;

export type TopBarIconButtonSize = keyof typeof TOP_BAR_ICON_BUTTON;
