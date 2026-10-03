/**
 * Prospect chat — the "Ask noorana" box in the landing page's lower-right corner,
 * for visitors who haven't signed up yet. The suggested questions answer
 * instantly from curated copy (`src/lib/prospect-chat.ts`), anything typed goes to
 * a small public AI endpoint grounded in the product facts, and "Contact support"
 * emails the team.
 */

/** Product name used in the prospect chat's copy and in the AI's persona. */
export const PRODUCT_NAME = "noorana";

/** Public, unauthenticated chat endpoint for typed questions. */
export const PROSPECT_CHAT_API = "/api/ai/prospect-chat";

/**
 * DOM ids for the floating launcher and its panel. The scroll-to-top button and
 * the launcher itself stack around these with `[body:has(#…)_&]` classes, which
 * Tailwind can only read as literals — keep those class strings in step if you
 * rename them.
 */
export const PROSPECT_CHAT_LAUNCHER_ID = "prospect-chat-launcher";
export const PROSPECT_CHAT_PANEL_ID = "prospect-chat-panel";

export type ProspectSuggestionId = "what-it-does" | "pricing" | "bank-linking";

/** The three one-tap questions. Answers are built in `src/lib/prospect-chat.ts`. */
export const PROSPECT_CHAT_SUGGESTIONS: { id: ProspectSuggestionId; question: string }[] = [
  { id: "what-it-does", question: `What can ${PRODUCT_NAME} do for me?` },
  { id: "pricing", question: "Is it free? What does Pro add?" },
  { id: "bank-linking", question: "Do I need to link my bank account?" },
];

/** Pause before a suggested answer appears, so it reads as a reply rather than a page swap. */
export const CANNED_REPLY_DELAY_MS = 650;

// ── Chat limits ───────────────────────────────────────────────────────────
// The endpoint is public, so every limit here is also a cost ceiling.

/** Longest question a visitor can type. */
export const PROSPECT_CHAT_MAX_INPUT_CHARS = 500;
/** Messages of history sent to the model; older turns are dropped server-side. */
export const PROSPECT_CHAT_MAX_HISTORY = 12;
/** Per-message cap applied server-side (assistant turns run longer than questions). */
export const PROSPECT_CHAT_MAX_MESSAGE_CHARS = 1500;
/** Keeps answers short and bounds the cost of any one reply. */
export const PROSPECT_CHAT_MAX_OUTPUT_TOKENS = 450;
export const PROSPECT_CHAT_RATE_LIMIT_PER_MINUTE = 6;
export const PROSPECT_CHAT_RATE_LIMIT_PER_HOUR = 30;

// ── Contact support ───────────────────────────────────────────────────────

export const SUPPORT_NAME_MAX_CHARS = 80;
export const SUPPORT_EMAIL_MAX_CHARS = 254;
export const SUPPORT_MESSAGE_MIN_CHARS = 10;
export const SUPPORT_MESSAGE_MAX_CHARS = 2000;
/** Most recent chat messages attached to a support request for context. */
export const SUPPORT_TRANSCRIPT_MAX_MESSAGES = 20;
/** Support requests allowed per visitor (by IP) within the window below. */
export const SUPPORT_RATE_LIMIT_COUNT = 3;
export const SUPPORT_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
