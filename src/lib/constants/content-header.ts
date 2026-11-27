/**
 * Sizes for the buttons on the right of a page header (`ContentHeader`), so they match
 * on every page: 40px tall on phones and tablets and 44px on computers, the same as
 * the buttons in the app's top bar above them.
 */
export const CONTENT_HEADER_ACTION_SIZE = {
  /** A `Button` with a label (an icon is fine too). */
  button: "lg",
  /** An icon-only `Button`, such as edit and delete on a detail page. */
  icon: "icon-lg",
  /** Height for a control beside them that is not a `Button`, such as a month picker. */
  controlClass: "h-10 lg:h-11",
} as const;
