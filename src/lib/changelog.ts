export type ChangeType = "feature" | "fix" | "hotfix" | "improvement";

export type ChangelogChange = {
  type: ChangeType;
  description: string;
};

export type ChangelogEntry = {
  version: string;
  date: string;
  summary?: string;
  changes: ChangelogChange[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.2",
    date: "2026-04-26",
    summary: "Built-in Cash and Borrowed accounts appear for all users automatically.",
    changes: [
      { type: "feature", description: "Cash and Borrowed are now built-in accounts — they appear on the Accounts page for every user without needing to be created manually." },
      { type: "improvement", description: "Built-in accounts show a 'Built-in' badge and cannot be edited or deleted." },
      { type: "improvement", description: "Accounts stat card now counts only user-created accounts, not built-in ones." },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-04-26",
    summary: "Add Expense modal and account tag selector in expense forms.",
    changes: [
      { type: "feature", description: "Added full Add Expense dialog matching the edit modal — with name, amount, account, category, date, and note fields." },
      { type: "feature", description: "Account tag chips now appear in both Add and Edit Expense modals, letting users assign a tagged account directly from the form." },
      { type: "improvement", description: "Quick-add row (to-do style) revised — clean underline inputs with name, amount, and calendar icon at the right." },
      { type: "improvement", description: "Account tag chips also shown on each expense row and bill row for quick visual reference." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-26",
    summary: "Accounts page — label expenses and bills by bank or e-wallet account.",
    changes: [
      { type: "feature", description: "New Accounts page (/dashboard/accounts) to create named bank/e-wallet accounts with alias, bank name, tags, and color." },
      { type: "feature", description: "Accounts can be tagged on individual expenses and bills via a new optional account selector in both add and edit forms." },
      { type: "feature", description: "Each account card shows a combined this-month total of all tagged expenses and monthly bills." },
      { type: "improvement", description: "Accounts query uses staleTime: Infinity — data is fetched once and refreshed only after mutations." },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-04-25",
    summary: "Consistent page width and mobile layout for Bills and Expenses pages.",
    changes: [
      { type: "improvement", description: "Expenses page stats cards and pie chart now use a responsive layout: stacked vertically on mobile, side-by-side on tablet and up." },
      { type: "improvement", description: "Bills page max width narrowed to match the Expenses page for a more consistent layout." },
      { type: "improvement", description: "Dashboard stat card 'Bills unpaid' replaced with 'Bills + Expenses' showing the combined monthly total." },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-25",
    summary: "Welcome email for new users, in-app changelog page, and version display.",
    changes: [
      { type: "feature", description: "Welcome email sent automatically to every new user on sign-up, with feature highlights and a CTA to the dashboard." },
      { type: "feature", description: "New 'What's New' changelog page (sidebar → What's New) showing release history with typed badges: Feature, Improvement, Fix, Hotfix." },
      { type: "feature", description: "App version number displayed next to the OmniTrak logo in the sidebar." },
      { type: "improvement", description: "Shared SMTP email utility (src/lib/email.ts) centralising transporter creation and reusable across future email types." },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-25",
    summary: "Mobile UX overhaul, expenses page redesign, and Pro plan improvements.",
    changes: [
      { type: "feature", description: "Expenses page: stat cards and paid-vs-unpaid pie chart layout matching the bills page for better mobile UX." },
      { type: "feature", description: "Mobile header: logo moved next to burger menu; search button expands full-width inline search with keyboard navigation." },
      { type: "feature", description: "Desktop header: fully functional search bar with grouped results, arrow-key navigation, and outside-click dismiss." },
      { type: "feature", description: "Search index covering all app routes, calculators, account pages, and legal documents." },
      { type: "feature", description: "Dashboard random greeting — one of 10 phrases chosen per session instead of a static 'Hello'." },
      { type: "feature", description: "Pro subscription card: 🔥 Most Popular ribbon, larger scale, and ring highlight on both landing and account subscription pages." },
      { type: "feature", description: "Bottom navbar Home item uses House icon and only highlights on the exact /dashboard route." },
      { type: "improvement", description: "Due dates clarified as a free feature; Pro plan now correctly lists email reminders as the exclusive benefit." },
      { type: "improvement", description: "Dashboard bills paid ring inner circle is now transparent instead of filled, giving a cleaner donut appearance." },
      { type: "fix", description: "Subscription badge on the account menu no longer shows the previous account's tier after switching users — React Query cache is now cleared on every auth state change." },
      { type: "fix", description: "App logo image corrected." },
      { type: "fix", description: "Bills page and landing page layout fixes." },
      { type: "fix", description: "Dashboard summary display fixes." },
      { type: "fix", description: "Bills revamp: layout and data handling improvements." },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    summary: "Initial public release of OmniTrak.",
    changes: [
      { type: "feature", description: "Dashboard with monthly cashflow overview, bills summary, and expense breakdown." },
      { type: "feature", description: "Expense tracker with categories, CSV and Excel export." },
      { type: "feature", description: "Bills board with paid/unpaid tracking, due dates, and cadence support." },
      { type: "feature", description: "Goals tracker for short-term and long-term savings targets." },
      { type: "feature", description: "To-Buy list and To-Do list with drag-and-drop reordering." },
      { type: "feature", description: "Debt Payoff and Savings calculators." },
      { type: "feature", description: "Pro and Premium subscription plans with Stripe integration." },
      { type: "feature", description: "Partner/shared access — invite another user to view your expenses." },
      { type: "feature", description: "Email bill reminders (Pro+)." },
      { type: "feature", description: "Rent Tracker and Payment Tracker (Premium)." },
      { type: "feature", description: "Dark mode and theme toggle." },
      { type: "feature", description: "Admin panel: users, categories, pricing, notifications, logs, reviews." },
    ],
  },
];
