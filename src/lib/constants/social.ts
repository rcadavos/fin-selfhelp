/**
 * Facebook Page tools in /admin/settings: the Graph API connection, the cover and
 * profile picture sizes, the post queue the social-posts cron publishes, and the
 * idea bank the composer starts from.
 */

import { PRODUCT_NAME, IN_APP_ASSISTANT_NAME } from "./prospect-chat";
import { MASCOT_NAME } from "./mascot";
import { TRIAL_DURATION_DAYS } from "./trial";
import {
  REFERRAL_CONVERSION_REWARD_MONTHS,
  REFERRAL_SIGNUPS_PER_REWARD,
  REFERRAL_SIGNUP_REWARD_MONTHS,
} from "./referral";

// ── Graph API ────────────────────────────────────────────────────────────────

/** Pinned Graph API version. Meta supports each one for about two years; raise it when it nears retirement. */
export const META_GRAPH_API_VERSION = "v26.0";
export const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/** Server env vars the connection reads. Only names live here, never values. */
export const META_ENV = {
  pageId: "META_PAGE_ID",
  token: "META_SYSTEM_USER_TOKEN",
  appSecret: "META_APP_SECRET",
} as const;

/** Permissions to tick when generating the system user's token. */
export const META_SYSTEM_USER_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

/** How long a Page token derived from the system user token is reused, per server instance. */
export const META_PAGE_TOKEN_CACHE_MS = 30 * 60_000;

/** Recent Page posts shown under the preview. */
export const FACEBOOK_RECENT_POSTS_LIMIT = 6;

// ── Cover and profile picture ────────────────────────────────────────────────

/**
 * Covers show at 820 × 312 on a computer and 640 × 360 on a phone, cropped from
 * the middle. Drawn at twice the computer size so they stay sharp on retina screens.
 */
export const FACEBOOK_COVER_SIZE = { width: 1640, height: 624 } as const;

/** The share of the cover's width a phone shows (its 16:9 crop of the middle). */
export const FACEBOOK_COVER_PHONE_SAFE_RATIO =
  (FACEBOOK_COVER_SIZE.height * (16 / 9)) / FACEBOOK_COVER_SIZE.width;

/** Profile pictures show as a circle; 720 px keeps them sharp everywhere Facebook shows them. */
export const FACEBOOK_PROFILE_SIZE = 720;

export const FACEBOOK_COVER_VARIANTS = [
  { id: "brand", label: "Brand", hint: "Otto, the name and what the app does" },
  { id: "bills", label: "Bills", hint: "Never miss a bill, with sample bills" },
  { id: "otto", label: `Ask ${MASCOT_NAME}`, hint: "The AI assistant, with a sample question" },
  { id: "season", label: "Holiday season", hint: "13th month and Christmas budgeting (Nov to Dec)" },
] as const;

export type FacebookCoverVariant = (typeof FACEBOOK_COVER_VARIANTS)[number]["id"];

export const FACEBOOK_PROFILE_VARIANTS = [
  { id: "green", label: "Green", hint: "Otto on the brand green" },
  { id: "paper", label: "Light", hint: "Otto on the app's paper white" },
] as const;

export type FacebookProfileVariant = (typeof FACEBOOK_PROFILE_VARIANTS)[number]["id"];

/** Where the generated images are served (admin only). */
export const BRAND_ASSET_ROUTE = "/api/admin/brand";

export function facebookCoverSrc(variant: FacebookCoverVariant): string {
  return `${BRAND_ASSET_ROUTE}/facebook-cover?variant=${variant}`;
}

export function facebookProfileSrc(variant: FacebookProfileVariant): string {
  return `${BRAND_ASSET_ROUTE}/facebook-profile?variant=${variant}`;
}

// ── Post queue ───────────────────────────────────────────────────────────────

export const SOCIAL_POST_STATUSES = ["draft", "scheduled", "publishing", "published", "failed"] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const SOCIAL_POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

/** `app_settings` key for the auto-publish switch. Off pauses the cron without touching the queue. */
export const SOCIAL_AUTOPUBLISH_SETTING_KEY = "social_autopublish_enabled";

/** Longest message the composer takes (Facebook allows far more; posts this long don't get read). */
export const SOCIAL_MESSAGE_MAX_CHARS = 5000;

/** Above this, Facebook cuts the post off behind "See more". */
export const SOCIAL_MESSAGE_SEE_MORE_CHARS = 480;

// ── Post images ──────────────────────────────────────────────────────────────

/**
 * Public Supabase Storage bucket for post photos (migration 103). Public because
 * Facebook fetches the photo from its address when the post goes out.
 */
export const SOCIAL_IMAGE_BUCKET = "social-post-images";

/** Facebook's limit for photos fetched by address. */
export const SOCIAL_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/** Formats Facebook takes for Page photos; WebP is left out because it can be refused. */
export const SOCIAL_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"] as const;

export const SOCIAL_IMAGE_EXTENSIONS: Record<(typeof SOCIAL_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

/** Posts the cron publishes per run, so one run stays well inside the function time limit. */
export const SOCIAL_CRON_BATCH_SIZE = 5;

/**
 * A post stuck in "publishing" this long was cut off mid-run. It is marked failed
 * rather than retried, because Facebook may already have it.
 */
export const SOCIAL_PUBLISHING_STALE_MINUTES = 15;

/** Schedule times are entered and shown in Manila time (no daylight saving, so a fixed offset is exact). */
export const SOCIAL_TIME_ZONE = "Asia/Manila";
export const SOCIAL_TIME_ZONE_OFFSET = "+08:00";
export const SOCIAL_TIME_ZONE_LABEL = "Manila time";

/** One-tap times in the composer: before work, lunch, and the evening scroll. */
export const SOCIAL_QUICK_TIMES = ["07:30", "12:00", "19:30"] as const;

/** Pages a post can link to in one tap. Facebook draws each one's preview card from its Open Graph tags. */
export const SOCIAL_LINK_PRESETS = [
  { label: "Home", path: "/" },
  { label: "Sign up", path: "/signup" },
  { label: "Calculators", path: "/calculators" },
  { label: "Tax calculator", path: "/calculators/tax" },
  { label: "Savings calculator", path: "/calculators/savings" },
  { label: "Debt payoff", path: "/calculators/debt-payoff" },
  { label: "What's new", path: "/changelog" },
] as const;

// ── Idea bank ────────────────────────────────────────────────────────────────

export const SOCIAL_POST_PILLARS = [
  { id: "seasonal", label: "PH money moments", cadence: "As they come", description: "Payday, 13th month, Christmas, tax season, school opening. Timely posts get shared." },
  { id: "tips", label: "Money tips", cadence: "2 a week", description: "Short, useful habits. Value first, product second. Builds trust and saves." },
  { id: "feature", label: "Feature spotlight", cadence: "1 a week", description: "One feature, the problem it solves, one link." },
  { id: "otto", label: `${MASCOT_NAME} asks`, cadence: "1 a week", description: `${MASCOT_NAME} asks a question. Comments push the Page to more people.` },
  { id: "offer", label: "Trial & referrals", cadence: "2 a month", description: "The free trial and the referral rewards. Keep these the minority." },
  { id: "updates", label: "What's new", cadence: "Each release", description: "New features from the changelog, in plain words." },
] as const;

export type SocialPostPillar = (typeof SOCIAL_POST_PILLARS)[number]["id"];

export type SocialPostIdea = {
  id: string;
  pillar: SocialPostPillar;
  title: string;
  /** When it lands best, shown on the card. */
  timing: string;
  message: string;
  /** Path on the site the post links to; Facebook shows that page's preview card. */
  linkPath: string;
};

const APP = PRODUCT_NAME;

export const SOCIAL_POST_IDEAS: SocialPostIdea[] = [
  {
    id: "13th-month",
    pillar: "seasonal",
    title: "Give your 13th month a plan",
    timing: "Late Nov to Dec 24",
    linkPath: "/",
    message: `Your 13th month pay lands by December 24. Before it disappears into the holidays, give every peso a job:

• Bills and debts first
• Your savings goal second
• Gifts and Noche Buena last, with a set limit

List them as Bills and Goals in ${APP} and see exactly what's left to spend. Free to start, no bank linking.`,
  },
  {
    id: "christmas-budget",
    pillar: "seasonal",
    title: "Set the Christmas total first",
    timing: "December",
    linkPath: "/",
    message: `Christmas list ready? Set one total first, then split it: gifts, food, travel, decorations. 🎄

When the total is spent, the season is funded. Whatever's left goes to January's bills, which come right after.

${APP} keeps the total and the bills in one place.`,
  },
  {
    id: "payday-split",
    pillar: "seasonal",
    title: "Payday split (15th and 30th)",
    timing: "The 15th and the last day of the month",
    linkPath: "/",
    message: `Sweldo day! Before the cart checkout, split it:

1. Bills due before your next payday
2. Savings, even ₱500 counts
3. Everything else

${APP} shows which bills fall before your next payday, so you know what's really free to spend.`,
  },
  {
    id: "tax-season",
    pillar: "seasonal",
    title: "Tax season calculator",
    timing: "March to April 15",
    linkPath: "/calculators/tax",
    message: `Income tax deadline is April 15. Want a quick estimate first?

Our free Philippine income tax calculator works it out in under a minute. No sign-up needed.`,
  },
  {
    id: "late-fees",
    pillar: "tips",
    title: "Late fees are a memory problem",
    timing: "Any week",
    linkPath: "/",
    message: `Most late fees aren't about money. They're about memory.

Write down every bill with its due date once: electricity, water, internet, credit cards, insurance, streaming. Then let reminders do the remembering.

How many bills do you pay every month? 👇`,
  },
  {
    id: "snowball-avalanche",
    pillar: "tips",
    title: "Snowball or avalanche?",
    timing: "Any week • good in January",
    linkPath: "/calculators/debt-payoff",
    message: `Paying off debt: snowball or avalanche?

❄️ Snowball pays the smallest balance first, for quick wins.
🏔️ Avalanche pays the highest interest first, and costs less overall.

Try both with your own numbers in our free debt payoff calculator.`,
  },
  {
    id: "emergency-fund",
    pillar: "tips",
    title: "Start the emergency fund small",
    timing: "Any week",
    linkPath: "/calculators/savings",
    message: `An emergency fund is 3 to 6 months of expenses. That number scares people off, so start smaller: one month.

How long will it take at ₱1,000 a week? Our free savings calculator does the maths.`,
  },
  {
    id: "subscription-audit",
    pillar: "tips",
    title: "Subscription audit",
    timing: "Start of the month",
    linkPath: "/",
    message: `5-minute money win: list every subscription you pay for. Streaming, cloud storage, apps, the gym.

Add up the yearly cost. Most people find at least one they forgot about.

Keep the ones you use and add them as Bills, so none of them surprises you again.`,
  },
  {
    id: "bill-reminders",
    pillar: "feature",
    title: "Never pay a late fee again",
    timing: "Any week",
    linkPath: "/",
    message: `Add your bills once. ${APP} reminds you before each one is due, marks it paid in one tap, and shows what's left for the month.

That's it. No spreadsheets, no bank login.`,
  },
  {
    id: "ask-otto",
    pillar: "feature",
    title: `Meet ${IN_APP_ASSISTANT_NAME}`,
    timing: "Any week",
    linkPath: "/",
    message: `Meet ${MASCOT_NAME} 🦉 our AI assistant.

Ask "How much did I spend on food this month?" or "Can I afford a ₱15,000 phone?" and he answers from your own budget, accounts and goals.

Included in Pro, and in the ${TRIAL_DURATION_DAYS}-day free trial.`,
  },
  {
    id: "no-bank-linking",
    pillar: "feature",
    title: "No bank login, ever",
    timing: "Any week",
    linkPath: "/",
    message: `${APP} never asks for your bank login. You add what matters, and it stays yours.

Simple, private money tracking on your phone, tablet and computer.`,
  },
  {
    id: "otto-forgotten-bill",
    pillar: "otto",
    title: "The bill you always almost forget",
    timing: "Weekend",
    linkPath: "/",
    message: `${MASCOT_NAME} wants to know 🦉

What's the one bill you always ALMOST forget? Comment below 👇`,
  },
  {
    id: "otto-payday-or-due",
    pillar: "otto",
    title: "Payday or due date?",
    timing: "Weekend",
    linkPath: "/",
    message: `${MASCOT_NAME}'s question of the week 🦉

Do you pay your bills as soon as the sweldo comes in, or on the due date?

A for payday, B for due date 👇`,
  },
  {
    id: "free-trial",
    pillar: "offer",
    title: `${TRIAL_DURATION_DAYS}-day Pro trial`,
    timing: "Twice a month",
    linkPath: "/signup",
    message: `Try every Pro feature free for ${TRIAL_DURATION_DAYS} days: ${IN_APP_ASSISTANT_NAME}, email reminders, unlimited reminders and partner sharing.

No card needed. After the trial, keep the free plan for as long as you like.`,
  },
  {
    id: "referral",
    pillar: "offer",
    title: "Share and earn free Pro",
    timing: "Once a month",
    linkPath: "/",
    message: `Share ${APP}, earn free Pro 🎁

Every ${REFERRAL_SIGNUPS_PER_REWARD} friends who sign up with your link earn you ${REFERRAL_SIGNUP_REWARD_MONTHS} month of Pro, and every friend who upgrades earns you ${REFERRAL_CONVERSION_REWARD_MONTHS} more.

Your link is under Referrals in the app.`,
  },
];

/** A "What's new" draft from a changelog line. */
export function changelogPostMessage(description: string): string {
  return `New in ${APP} ✨

${description}`;
}

// ── AI drafts ────────────────────────────────────────────────────────────────

export const SOCIAL_AI_DRAFT_COUNT = 3;
export const SOCIAL_AI_MAX_OUTPUT_TOKENS = 900;
export const SOCIAL_AI_NOTES_MAX_CHARS = 500;
/** Line the model puts between drafts, so they split cleanly. */
export const SOCIAL_AI_DRAFT_SEPARATOR = "===";
