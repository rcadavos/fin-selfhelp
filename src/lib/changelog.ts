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
    version: "1.4.4",
    date: "2026-04-28",
    summary: "Expenses page: month selector, locked calendar, and delete confirmation.",
    changes: [
      { type: "improvement", description: "Added month selector on the Expenses page (inline with + Add Expense) defaulting to current month, allowing navigation to past 12 months." },
      { type: "improvement", description: "Inline date picker calendar now locks navigation to the selected month only — no forward/backward month browsing." },
      { type: "improvement", description: "Quick-add date resets to the 1st of the selected month when switching to a past month, and to today when on the current month." },
      { type: "improvement", description: "Expense list delete now shows a confirmation dialog before permanently removing an expense." },
    ],
  },
  {
    version: "1.4.3",
    date: "2026-04-28",
    summary: "Admin users table now shows email confirmation date.",
    changes: [
      { type: "improvement", description: "Admin users table: added 'Confirmed' column showing the date the user confirmed their email." },
    ],
  },
  {
    version: "1.4.2",
    date: "2026-04-28",
    summary: "Cookie consent replaced with a minimal bottom-right popover.",
    changes: [
      { type: "improvement", description: "Cookie consent dialog replaced with a compact bottom-right popover showing a 'Read our cookie policy' link and a close button." },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-04-28",
    summary: "Bills board: distinct status colors for Upcoming, Unpaid, Overdue, and Paid.",
    changes: [
      { type: "improvement", description: "Bill status 'Upcoming' (not yet due) now shows a blue badge and blue row highlight." },
      { type: "improvement", description: "Bill status 'Overdue' label renamed from 'Outstanding' to 'Overdue' for clarity." },
      { type: "improvement", description: "Bills sort order updated: Overdue → Unpaid (due today) → Upcoming → Paid." },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-04-27",
    summary: "Fuel & Vehicles tracker — register vehicles and monitor transport spending.",
    changes: [
      { type: "feature", description: "New Fuel & Vehicles page at /dashboard/fuel — add, edit, and delete your vehicles (name, type, make, model, year, plate, color, fuel type, notes)." },
      { type: "feature", description: "Each vehicle card shows total transport spending from linked bills and expenses (bills total, expenses total, and entry count)." },
      { type: "feature", description: "Bills with Transport & Commute category now show an optional Vehicle selector, linking the bill directly to one of your registered vehicles." },
      { type: "improvement", description: "Fuel & Vehicles added to sidebar navigation and global search index at /dashboard/fuel." },
    ],
  },
  {
    version: "1.3.21",
    date: "2026-04-27",
    summary: "Performance: eliminate unwanted refetches and rerenders on dashboard, expenses, and bills.",
    changes: [
      { type: "improvement", description: "Dashboard, expenses, and bills data now use staleTime: Infinity — data only refreshes after a real mutation, not on timer or window focus." },
      { type: "improvement", description: "Disabled refetchOnWindowFocus and refetchOnReconnect globally — switching tabs or reconnecting no longer triggers unnecessary network requests." },
      { type: "improvement", description: "Fixed staleTime typo in query client (was 25 min due to wrong multiplier, now correctly 5 min for general queries)." },
      { type: "fix", description: "monthlyBreakdown query key is now correctly scoped under the app's query hierarchy so it clears properly on user logout." },
      { type: "improvement", description: "Toggling a bill/expense payment no longer triggers a redundant refetch — optimistic updates are already correct and sufficient." },
      { type: "improvement", description: "Bills board category list is now memoized to prevent unnecessary child rerenders." },
      { type: "fix", description: "Expenses board no longer fires a data fetch before auth resolves (added enabled guard)." },
      { type: "improvement", description: "Removed refreshKey state from BudgetRefreshContext — calling refreshBudget() after mutations was causing a full re-render of the dashboard for no benefit (refreshKey was never consumed)." },
      { type: "improvement", description: "Notifications query now uses staleTime: Infinity with refetch guards — no longer polling on a 5-min cycle between navigations." },
      { type: "improvement", description: "Subscription plan query on dashboard now waits for auth before firing, avoiding a wasted pre-auth request." },
      { type: "improvement", description: "DASHBOARD_BENEFITS list moved outside the component — was recreated as a new array on every render." },
    ],
  },
  {
    version: "1.3.20",
    date: "2026-04-27",
    summary: "Profile name change now instantly updates the account menu.",
    changes: [
      { type: "fix", description: "Saving a new full name on the Profile page now immediately reflects in the account dropdown menu without requiring a page reload." },
    ],
  },
  {
    version: "1.3.19",
    date: "2026-04-27",
    summary: "Landing page now shows user reviews; removed 'Reviews & Suggestions' from Pro plan benefits.",
    changes: [
      { type: "improvement", description: "User reviews section restored to the landing page." },
      { type: "improvement", description: "Removed 'Reviews & Suggestions' from Pro plan feature list on the pricing section." },
    ],
  },
  {
    version: "1.3.18",
    date: "2026-04-27",
    summary: "Partner sharing now shares Bills instead of My Expenses.",
    changes: [
      { type: "improvement", description: "Shared access now shows a partner's Bills (read-only with paid/unpaid toggle) instead of the My Expenses cashflow view." },
      { type: "improvement", description: "All sharing labels updated from 'My Expenses' to 'Bills' in settings, shared account hub, and access descriptions." },
    ],
  },
  {
    version: "1.3.17",
    date: "2026-04-27",
    summary: "In-app notification when admin grants a Pro or Premium subscription.",
    changes: [
      { type: "feature", description: "Users now receive an in-app notification when an admin activates their Pro or Premium plan, showing the tier and expiry date." },
    ],
  },
  {
    version: "1.3.16",
    date: "2026-04-27",
    summary: "To-buy and to-do free plan reduced to 5 items; items beyond the limit are blurred with a Pro lock badge.",
    changes: [
      { type: "improvement", description: "Free plan to-buy and to-do lists now allow 5 items max (down from 10). Items beyond the limit are blurred and show a Pro lock badge instead of being hidden or deleted." },
      { type: "improvement", description: "A plan note is shown below the page title: free users see '5 items max — upgrade to Pro', Pro/Premium users see 'Unlimited items with Pro or Premium'." },
      { type: "improvement", description: "Subscription pages (landing and account) updated to reflect the new 5-item free tier limit." },
    ],
  },
  {
    version: "1.3.15",
    date: "2026-04-27",
    summary: "Dashboard insight popup shows streak or financial status in the bottom-right corner.",
    changes: [
      { type: "feature", description: "A closable bottom-right popup slides in on the dashboard showing your day streak (if 2+), monthly bills paid percentage, or a financial tip." },
      { type: "improvement", description: "Streak info moved from the welcome greeting to the insight popup." },
    ],
  },
  {
    version: "1.3.14",
    date: "2026-04-27",
    summary: "All monetary values now display with two decimal places app-wide.",
    changes: [
      { type: "improvement", description: "Currency and number formatting now shows full decimal values instead of rounding to whole numbers." },
      { type: "improvement", description: "Amount input fields now accept decimal values (e.g. 1,234.56)." },
    ],
  },
  {
    version: "1.3.13",
    date: "2026-04-27",
    summary: "Dashboard welcome greeting shows a fire streak for consecutive daily active users.",
    changes: [
      { type: "feature", description: "Dashboard welcome now shows a 🔥 day streak count when you visit on consecutive days." },
    ],
  },
  {
    version: "1.3.12",
    date: "2026-04-27",
    summary: "Bills page smart defaults and correct outstanding logic for quarterly/yearly bills.",
    changes: [
      { type: "improvement", description: "Add Bill dialog auto-selects the billing period matching the active tab (quarterly or yearly)." },
      { type: "fix", description: "Quarterly bills now show outstanding based on the current quarter's due date, not the current month." },
      { type: "fix", description: "Yearly bills now show outstanding based on the bill's due month in the current year, not the current month." },
      { type: "improvement", description: "Quarterly bill due date label now shows Q1–Q4 and the quarter's start month (e.g. Q2 • Apr 15)." },
    ],
  },
  {
    version: "1.3.12",
    date: "2026-04-27",
    summary: "Free/expired users receive exactly 1 bill reminder per month, not all reminders set during Pro.",
    changes: [
      { type: "fix", description: "When a subscription expires, bill reminders are now capped to 1 — the bill that previously held the free reminder slot, or the first eligible bill if none has fired yet. Expense and to-do reminders remain Pro-only." },
    ],
  },
  {
    version: "1.3.11",
    date: "2026-04-27",
    summary: "Category names in bills and expenses now come from the database instead of a static list.",
    changes: [
      { type: "improvement", description: "Bills board and expenses board now load category names from the database, so admin-managed categories are always reflected." },
    ],
  },
  {
    version: "1.3.10",
    date: "2026-04-27",
    summary: "Bills list shows paid/unpaid/outstanding status badges and account badge before amount.",
    changes: [
      { type: "improvement", description: "Bill rows now show a Paid, Unpaid, or Outstanding status badge next to the bill name." },
      { type: "improvement", description: "Account badge moved to appear directly before the amount for better visual grouping." },
      { type: "improvement", description: "Mark paid/unpaid toggle button now has a data-title attribute for tooltip support." },
      { type: "fix", description: "Editing a bill no longer clears the Account tag — account_id was being fetched from Supabase but dropped during data mapping." },
    ],
  },
  {
    version: "1.3.9",
    date: "2026-04-27",
    summary: "Free users get 1 permanent bill reminder (in-app & email); bill reminders now actually fire via cron.",
    changes: [
      { type: "feature", description: "Free plan now allows 1 bill to have a due reminder (in-app and email)." },
      { type: "feature", description: "Free reminder slot is permanently locked to the first bill that fires a reminder — prevents swapping bills to abuse the free tier." },
      { type: "fix", description: "Bill reminders were never sent by the cron job — it only processed expense entries. Now the cron and notification system also process the bills table for all users." },
      { type: "improvement", description: "Bills add/edit modal shows a 0/1 or 1/1 free reminder badge; once permanently locked, shows a lock icon with 'Permanent' label on the owning bill and 'Slot locked' on all others." },
      { type: "improvement", description: "Bill row shows an amber lock chip when it permanently holds the free reminder slot." },
      { type: "improvement", description: "Subscription pages (landing and account) updated to reflect the 1 bill reminder free tier benefit." },
      { type: "improvement", description: "Reminder emails now use the same branded HTML template as auth emails — logo, styled item cards, and a CTA button." },
      { type: "fix", description: "Reminder email dedupe log entries are now rolled back when SMTP send fails, so the next cron run or test trigger can retry instead of silently skipping." },
      { type: "improvement", description: "Consolidated duplicate sendReminderEmail implementations into a single shared function in email.ts." },
    ],
  },
  {
    version: "1.3.8",
    date: "2026-04-26",
    summary: "Signup shows check-email success screen; login shows confirmation reminder for unverified accounts.",
    changes: [
      { type: "improvement", description: "Signup now replaces the form with a dedicated check-your-email screen after successful registration instead of a small inline banner." },
      { type: "improvement", description: "Login now shows a clear amber warning with the email address when the user has not confirmed their email yet." },
    ],
  },
  {
    version: "1.3.7",
    date: "2026-04-26",
    summary: "Send a notification email when user changes their phone number.",
    changes: [
      { type: "feature", description: "Users now receive a confirmation email when their phone number is updated from the profile page." },
    ],
  },
  {
    version: "1.3.6",
    date: "2026-04-26",
    summary: "Fix dashboard chart showing zero savings for recurring savings entries; add go-to arrows on stat cards.",
    changes: [
      { type: "fix", description: "Monthly breakdown chart now correctly includes recurring savings entries (those with a due date) in every month since they were created, matching how bills are counted." },
      { type: "improvement", description: "Added an ArrowUpRight icon to the top-right of each dashboard stat card to visually indicate they are clickable links." },
    ],
  },
  {
    version: "1.3.5",
    date: "2026-04-26",
    summary: "Bills add/edit modal now supports Account tags.",
    changes: [
      { type: "improvement", description: "Bills add and edit modals now include an Account tag selector, matching the Expenses modal." },
    ],
  },
  {
    version: "1.3.4",
    date: "2026-04-26",
    summary: "Fix quick-add expense form mobile layout and placeholder visibility.",
    changes: [
      { type: "fix", description: "Quick-add expense form now stacks vertically on mobile, preventing button overlap." },
      { type: "fix", description: "Placeholder text in the expense name and amount inputs is now visible." },
    ],
  },
  {
    version: "1.3.3",
    date: "2026-04-26",
    summary: "Fix mobile search closing and iOS zoom issues.",
    changes: [
      { type: "fix", description: "Mobile search now closes when clicking outside the search area." },
      { type: "fix", description: "Mobile search input now uses 16px font size to prevent iOS auto-zoom on focus." },
    ],
  },
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
