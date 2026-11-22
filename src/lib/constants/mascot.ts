/**
 * Otto, OmniTrak's owl mascot. His drawings are `public/mascot/*.svg`, drawn by `npm run mascot:draw`
 * (`scripts/generate-mascot.mjs`); never edit those files by hand. Show him through the components in
 * `src/components/mascot/`.
 */

export const MASCOT_NAME = "Otto";

/** The assistant's name in the app, after him. */
export const ASSISTANT_NAME = `Ask ${MASCOT_NAME}`;

/** Raise when the drawings change, so browsers fetch the new files instead of the ones they kept. */
export const OTTO_VERSION = 1;

/** Where a drawing is served from. */
export function ottoSrc(file: string): string {
  return `/mascot/${file}?v=${OTTO_VERSION}`;
}

/** His head tilt wherever his face shows on its own (the logo, avatars, buttons): a curious owl's. */
export const OTTO_FACE_TILT_DEG = -10;

/**
 * How far below his box's bottom edge his feet sit, as a share of the box (his feet are at 87% of it), and how far
 * they overlap the card he stands on.
 */
export const OTTO_PERCH_DROP = 0.18;

/** The one-owl landing: flight, then wings folding, in one strip of 12 frames. */
export const OTTO_LANDING_FRAMES = 12;
/** Each landing frame is 400 units wide for his 340-unit box, so open wings have room. */
export const OTTO_LANDING_CELL_RATIO = 400 / 340;
/** The head turn's frames (0° to 180° in 15° steps). */
export const OTTO_TURN_FRAMES = 13;
/** The curious head tilt's frames (straight to tipped). */
export const OTTO_TILT_FRAMES = 5;

/** What each landing ends on. */
export const OTTO_LANDING_STRIPS = {
  idle: "otto-land-idle.svg",
  turn: "otto-land-idle-turn.svg",
  remind: "otto-land-remind.svg",
  check: "otto-land-check.svg",
  search: "otto-land-search.svg",
} as const;
