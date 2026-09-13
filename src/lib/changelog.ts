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
    version: "1.8.4",
    date: "2026-09-13",
    summary: "Planned Expenses is now just Bills.",
    changes: [
      { type: "improvement", description: "A fully paid day on the Bills calendar is now filled with the same green as the Mark paid button, instead of a faint tint that was easy to miss." },
      { type: "improvement", description: "The 'Needs you now' panel can be dismissed with an X if you want it out of the way. It comes back next time you open the page — it is hidden for the visit, not turned off." },
      { type: "improvement", description: "Renamed Planned Expenses to Bills everywhere — the sidebar, the bottom bar, page headings, dialogs, search, emails and the landing page. It is what everyone called it anyway, and it is shorter on a phone." },
      { type: "improvement", description: "The page now lives at /dashboard/bills. Old links and bookmarks to /dashboard/planned-expenses, including links to a single bill, redirect to the new address." },
      { type: "improvement", description: "On the Expenses page, the 'Planned paid' figure and the 'Planned' bars in the 6-month chart now read 'Bills', matching the rest of the app." },
    ],
  },
  {
    version: "1.8.3",
    date: "2026-09-13",
    summary: "A bill you just paid stays where you can see it.",
    changes: [
      { type: "improvement", description: "Marking a bill paid no longer drops it straight into the collapsed Settled list. It now sits in a new 'Recently paid' section for a week, stamped 'Paid today', 'Paid yesterday' or 'Paid 3 days ago', and only moves down to Settled once a week has passed since you marked it." },
    ],
  },
  {
    version: "1.8.2",
    date: "2026-09-12",
    summary: "Badges and status labels are rounded too.",
    changes: [
      { type: "feature", description: "The Expenses page now tells you whether a month is heavy. It shows what you have spent, what that projects to by month end, and how that compares with your own recent months — so the total means something without you doing the arithmetic." },
      { type: "improvement", description: "Each day in the list now carries its own total and a bar showing it against the heaviest day, so you can see what a day cost without adding it up." },
      { type: "improvement", description: "Added search and tappable category filters to Expenses. The category chips show the same breakdown the pie chart did and narrow the list as well, so the old chart is gone — the full breakdown still lives on the Categories page." },
      { type: "improvement", description: "Larger expenses now stand out in the list instead of every row looking the same, so the few entries that actually moved the month are easy to spot." },
      { type: "improvement", description: "Removed the 'Expenses — Today' figure. It read zero every morning and peaked at bedtime, so it measured the hour more than the habit; the new pace line covers it." },
      { type: "improvement", description: "Status labels — Paid, Overdue, Auto, Scheduled and the rest — are now rounded pills, matching the account and vehicle chips that sit next to them on the same row instead of looking square beside them." },
      { type: "improvement", description: "The same goes for the small labels elsewhere in the app: billing period tags on bills, vehicle tags, sidebar counts, the sharing and referral labels, and the trial badge on sign-up." },
      { type: "fix", description: "The back-to-top button now has a visible outline in both light and dark mode. It was asking for a border but never got a colour, so it drew a transparent one and the button faded into whatever was behind it." },
      { type: "improvement", description: "On phones, pop-up dialogs now slide up from the bottom of the screen as a sheet instead of appearing in the middle — closer to your thumb, with a grab handle at the top, and long ones scroll inside themselves rather than running off the screen. On tablets and desktop they stay centred." },
      { type: "improvement", description: "Rounded the last square corners on the sign-in and sign-up pages: the Password / One-time link switcher, the message and warning panels, the show-password button, and the logo tile." },
      { type: "improvement", description: "The plans on the landing page are now three separate cards instead of one block split by dividing lines, with the recommended plan outlined so it stands on its own." },
      { type: "improvement", description: "Rounded the profile menu's items — the panel was already rounded but each row squared off as you hovered it — along with the cards and plan switcher on your Subscription page." },
      { type: "fix", description: "The 'Back to Dashboard' button on the Subscription page had its padding stripped out, so it was cramped and awkward to tap. It now has a normal button's spacing while staying aligned with the text above it." },
      { type: "improvement", description: "Swept the rest of the app for square corners in one go rather than page by page: Settings, Referrals, Feedback, Vehicles, Receivables, Accounts, Categories, the AI document manager, admin pages and more — 132 panels in all. Text fields were rounded to match other inputs rather than to the card shape." },
      { type: "feature", description: "Hovering a date on the Bills calendar now shows what is due that day — each bill with its amount and whether it is due, overdue, part paid or settled. Tapping a date does the same on a phone." },
      { type: "improvement", description: "Calendar dates on Bills are now colour-coded by what they hold: green with a tick when everything due that day is paid, red when something is overdue, amber when a payment is due or part paid. The most urgent bill sets the colour, so one overdue bill still shows through on a day that is otherwise settled." },
      { type: "improvement", description: "Forms in the slide-out panels breathe more: extra space between fields and between side-by-side inputs, so a long form is easier to scan." },
      { type: "improvement", description: "Cancel and Save in those panels are now full touch-size buttons rather than the smaller default, which makes them easier to hit on a phone." },
      { type: "improvement", description: "Slide-out panels and mobile drawers open and close more smoothly — they ease out on the way in and back in on the way out, the backdrop now fades in step with the panel instead of snapping, and opening is quicker (was half a second)." },
      { type: "fix", description: "The Mark paid and Part payment buttons on Bills stayed square on desktop while everything around them had softened." },
      { type: "improvement", description: "The Reminders list now uses more of the screen on a desktop — it was capped at a narrow column with a lot of empty space either side." },
    ],
  },
  {
    version: "1.8.1",
    date: "2026-09-12",
    summary: "Rounded corners everywhere, on desktop as well as phones.",
    changes: [
      { type: "improvement", description: "Cards, panels and dashboard modules now keep their rounded corners on desktop instead of sharpening. OmniTrak is a mobile-first app, so a card should read the same on a laptop as it does in your hand." },
      { type: "improvement", description: "The landing page is rounded on every screen size — the feature cards, pricing table, stats band, calculators, reviews, the hero ledger and the assistant chat bubbles." },
      { type: "improvement", description: "Buttons, menus, dropdowns, date pickers, dialogs, text fields and toasts now share the same rounded language, so nothing looks sharp next to a rounded card." },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-09-12",
    summary: "Bills rebuilt around when things are due, and whether you can cover them.",
    changes: [
      { type: "feature", description: "Bills now groups by what needs you — Overdue, Due this week, Later this month, and Settled — each with its own count and running total. The list was always sorted this way underneath; now the reasoning is visible instead of looking arbitrary." },
      { type: "feature", description: "In Full cashflow mode, a runway across the top plots every bill on the month, sized by amount and marked against today, so you can see what lands when at a glance." },
      { type: "feature", description: "Full cashflow mode also warns you when an account cannot cover what it owes this month — before you tap Mark paid, not after. The affected bill says how much that account is short." },
      { type: "feature", description: "In Bills & reminders mode, the page now opens on the single bill that needs you, with Mark paid attached and the next few queued behind it. Settle it and the next one steps up." },
      { type: "feature", description: "Bills & reminders mode gained a month calendar showing every due date at a glance, colour-coded by what is overdue, due, scheduled or already paid." },
      { type: "improvement", description: "Marking something paid is now a single tap on the row itself, instead of opening the three-dot menu and picking Mark paid." },
      { type: "improvement", description: "The Monthly / Quarterly / Yearly tabs are gone. A quarterly bill due this month is part of this month, so all of them now live on one screen rather than being split across three tabs with a total nobody budgets against." },
      { type: "improvement", description: "Reminders are now shown on every row in Bills & reminders mode, where they were previously hidden on phones — the mode has only two features and reminders is one of them." },
      { type: "improvement", description: "Rows are no longer tinted six different colours. Status reads from a stamp, with a coloured edge only on the ones actually behind, so what needs attention stands out instead of the list reading as a quilt." },
      { type: "improvement", description: "Removed the category pie chart from Bills. Category share is a year-end question and the chart was collapsed by default on phones anyway; the per-category breakdown is still available from the Categories button." },
    ],
  },
  {
    version: "1.7.5",
    date: "2026-09-09",
    summary: "Mobile layout fixes across the dashboard and bills, plus softer corners on phones.",
    changes: [
      { type: "fix", description: "Amounts on the dashboard no longer get cut off on phones. Large balances used to be clipped mid-number because a peso figure can never wrap, and the summary tiles had no room to shrink — they now scale down and fit whatever the amount is." },
      { type: "fix", description: "The Bills page no longer scrolls sideways on a phone. The two summary cards sat in a fixed side-by-side row that could grow wider than the screen once the amounts got long enough." },
      { type: "improvement", description: "Cards, tiles and bill rows now have noticeably rounder corners on phones and stay crisp on desktop, so the app feels more like an app in your hand and more like a ledger on a big screen." },
      { type: "improvement", description: "The three-dot menu on each bill is easier to hit on a touchscreen — the button looks the same but now has a full-size tap area, so it no longer takes two tries with a thumb." },
      { type: "improvement", description: "The mobile 'Add Bill' button is now just 'Add', so it stops crowding the month picker next to it on narrow screens." },
      { type: "improvement", description: "In Bills & reminders mode, bills no longer show an account badge. Accounts are switched off in that mode, so naming one was noise on every row — your saved account link is kept and reappears the moment you switch back to Full cashflow." },
      { type: "fix", description: "In Bills & reminders mode, a bill's detail page no longer shows an Account row whose badge led to the Accounts page — a page that mode deliberately blocks, so tapping it bounced you back to the dashboard. Account labels are also hidden from that bill's payment history there." },
      { type: "improvement", description: "Rounder corners on phones now reach the rest of the app, not just cards: buttons, dropdowns, menus, the Spending by category panel and the Monthly/Quarterly/Yearly switcher all soften on a phone and stay crisp on desktop, where nothing has changed." },
      { type: "improvement", description: "The month picker on Bills now reads 'Sep 2026' instead of 'September 2026', so the button and its dropdown stay the same width whichever month you pick instead of resizing as you scroll the list." },
      { type: "fix", description: "Closing the month picker no longer leaves four faint corner marks floating around it. A leftover focus outline was being drawn with no thickness but a 2px gap, which became visible once the corners got rounder; it is now only drawn for keyboard users, flush to the button." },
      { type: "fix", description: "The notifications panel no longer sits flush against the edge of a phone screen, and its loading spinner is no longer rendered five times too large — the OmniTrak mark briefly filled the whole panel while notifications loaded." },
      { type: "fix", description: "Page titles no longer disappear on a phone when a page has wide buttons beside them. On Notifications the 'Notifications' heading was being squeezed away to nothing and the buttons still ran off the edge of the screen; buttons now drop to their own line when they don't fit." },
      { type: "fix", description: "Tidied the Notifications page layout: the list was wrapped in an invisible panel that pushed text flush against its edges, so the page now spaces its heading, summary line and notifications consistently." },
    ],
  },
  {
    version: "1.7.4",
    date: "2026-08-22",
    summary:
      "Bills & reminders mode drops auto-debit and stops blocking payments on account balance, plus a round of account-security hardening.",
    changes: [
      { type: "improvement", description: "In Bills & reminders mode, marking a bill paid or partially paid no longer checks the linked account's balance, so a low tracked balance can never stop you recording a payment you have actually made. Full cashflow mode still warns you before a payment would overdraw an account." },
      { type: "improvement", description: "Bills & reminders mode no longer offers or runs auto-debit — the toggle is hidden and no bill is ever paid automatically. Your existing auto-debit settings are kept untouched and start working again the moment you switch back to Full cashflow." },
      { type: "fix", description: "Bills that already had auto-debit switched on no longer go silent in Bills & reminders mode: because nothing pays them automatically there, they now get a due-date reminder like any other bill, and you can set your own reminder days on them." },
      { type: "fix", description: "Opening any dashboard, account or admin page while signed out now takes you straight to the login page instead of briefly showing an empty app shell — and after you log in you land on the page you were originally trying to reach." },
      { type: "fix", description: "Shared receivable invite links still open without an account, as intended: the new sign-in requirement deliberately skips them, so someone you invite can review and confirm what they owe you before signing up." },
      { type: "hotfix", description: "Closed a gap that let a signed-in account switch itself onto a paid plan without paying. Subscriptions can now only be granted by a verified payment from our payment provider." },
      { type: "hotfix", description: "Subscription payments are now verified more strictly: the payment must actually have completed and must cover the price of the plan being claimed, and a repeated confirmation for the same payment can no longer add extra paid months." },
      { type: "hotfix", description: "Payment confirmations, receipts, reminder-email sends and referral payouts can no longer be triggered for another person's account — each is now restricted to the account it belongs to." },
      { type: "improvement", description: "Tightened permissions on several internal database helpers so they can only be used by the app's own trusted background jobs, and stopped one of them from being usable to check whether an email address has an OmniTrak account." },
      { type: "improvement", description: "Page-view analytics now ignores malformed or oversized page addresses instead of storing them." },
    ],
  },
  {
    version: "1.7.3",
    date: "2026-08-14",
    summary: "Sorting by last activity in the admin Users list.",
    changes: [
      { type: "improvement", description: "The admin Users list can now be sorted by last activity date — clicking the 'Last activity' column shows the most recently active accounts first, clicking again shows the least recently active, and a third click restores the default newest-signup order. Accounts with no recorded activity always sort last, and sorting works together with the search box." },
    ],
  },
  {
    version: "1.7.3",
    date: "2026-08-06",
    summary:
      "New referral program — invite friends and earn free months of Pro, with a share page in the app and referral reporting in admin.",
    changes: [
      { type: "feature", description: "Added a referral program: every account now gets a personal invite link and code. For every 5 friends who sign up through your link you earn 1 free month of Pro, and it stacks — 10 friends is 2 months, 15 is 3." },
      { type: "feature", description: "Every referred friend who upgrades to a paid plan earns you 1 more free month of Pro, once per friend and stackable, paid on top of your signup milestones." },
      { type: "feature", description: "New 'Refer & Earn' page under the dashboard with easy sharing: copy your code or link, share straight to WhatsApp, Facebook, X, Telegram or email, use your phone's native share sheet, show a scannable QR code, or send invites to up to 10 email addresses at once (25 per day)." },
      { type: "feature", description: "The referral page also shows your progress to the next free month, how many friends have joined and upgraded, and a ledger of every free month you have earned." },
      { type: "feature", description: "New Referrals section in the admin portal: programme totals plus per-referrer counts for signups, paid upgrades, free months granted, and last referral date, with search by email, name, or code." },
      { type: "feature", description: "Added a new referral-invite email that friends receive when you invite them by email, highlighting the 14-day Pro free trial their account starts with." },
      { type: "improvement", description: "Referral rewards are granted automatically and extend your Pro access from whenever it currently ends, so unused days are never lost and there is nothing to claim." },
      { type: "improvement", description: "The landing page now has a referral section with a worked example of how the free months stack, plus a new FAQ entry explaining the program." },
    ],
  },
  {
    version: "1.7.1",
    date: "2026-07-16",
    summary: "A simpler mobile navigation bar and an easier-to-reach account menu.",
    changes: [
      { type: "improvement", description: "Reworked the mobile bottom bar: it now shows Expenses, Bills, Accounts, and a new 'More' button (which opens the full menu) — the old 'Category' shortcut has been removed." },
      { type: "improvement", description: "Moved your profile and account menu to the top-right of the mobile header, and removed the hamburger menu since everything now lives in 'More' and the account button." },
      { type: "improvement", description: "Updated every email (welcome, reminders, receivable invites, account notifications, and admin broadcasts) to use the new OmniTrak chameleon logo and the app's Schibsted Grotesk wordmark, replacing the old logo image." },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-07-10",
    summary:
      "A brand-new look for OmniTrak — the calm, statement-inspired 'Passbook' design, rolled out across the landing page, sign-in, the dashboard, and every in-app screen in both light and dark mode.",
    changes: [
      { type: "feature", description: "Redesigned OmniTrak with a new 'Passbook' visual style inspired by a well-kept printed bank statement: one deep-green ink accent, clean hairline rules, dot-leader rows, status stamps (Paid, Due, Overdue), and aligned banking-grade numbers — no gradients or clutter." },
      { type: "improvement", description: "New landing page: a two-column hero with a live 'upcoming bills' ledger preview, real top navigation (Features, How it works, Pricing, FAQ), statement-style feature and pricing sections, and a two-column FAQ." },
      { type: "improvement", description: "New sign-in and sign-up: a split-screen layout with a passbook brand panel, tabbed password / one-time-link sign-in, a clearer password-strength meter, keyboard-accessible controls, and prominent 14-day Pro free trial messaging on sign-up." },
      { type: "improvement", description: "New dashboard home as a statement view: a tracked-balance header, flat at-a-glance stat cells, a cleaner spending chart in the app's own colors, and an upcoming-bills list with status stamps. Amounts now use aligned tabular figures and no longer jitter." },
      { type: "improvement", description: "Refreshed every in-app screen — accounts, expenses, bills, receivables, vehicles, goals, reminders, account settings, and admin — with flat hairline cards and a consistent green-and-neutral color system in place of the old multi-color chips, for cleaner, more legible pages in both light and dark mode." },
      { type: "improvement", description: "New typography: Schibsted Grotesk for text and Geist Mono for all numbers, dates, and amounts." },
      { type: "improvement", description: "New OmniTrak logo — a green app-icon mark paired with the wordmark set in the new app font — replacing the old logo image across the app, the sign-in panel, the browser tab, and the install icon." },
      { type: "improvement", description: "Bills now shows an 'Auto-debit' indicator on each bill set to pay automatically, so auto-paid bills are easy to spot in the list at a glance (matching the detail page and dashboard)." },
      { type: "fix", description: "Corrected the Free plan description to show one in-app bill reminder; email reminders remain a Pro feature." },
      { type: "fix", description: "Fixed a rare 'useInsertionEffect must not schedule updates' error that could appear when navigating or opening the cookie-policy dialog; the top loading bar now schedules its updates safely." },
    ],
  },
  {
    version: "1.6.1",
    date: "2026-06-29",
    summary:
      "New accounts now start with a 14-day Pro free trial — full Pro access, no card required.",
    changes: [
      { type: "feature", description: "Every new account automatically gets a 14-day Pro free trial on signup: email reminders, unlimited reminders, partner sharing, and custom expense categories. When the trial ends, accounts move to the free plan automatically." },
      { type: "improvement", description: "The welcome email now highlights the 14-day Pro free trial and the Pro features it unlocks, with an upgrade link for after the trial." },
      { type: "improvement", description: "The landing page now promotes the 14-day Pro free trial in the hero, the Plans section, and a new FAQ entry." },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-06-28",
    summary:
      "Introducing Ask OmniTrak — a private AI assistant for Pro and Premium members that answers questions about your finances and your own uploaded documents, available from a floating button on every screen.",
    changes: [
      { type: "feature", description: "New Ask OmniTrak AI assistant: chat about your budget, accounts, goals, and spending trends. It reads your live data on demand to answer accurately." },
      { type: "feature", description: "Knowledge base — upload PDFs, text, or Markdown files, paste notes, or add a website URL, and the assistant can search them to answer your questions (Retrieval-Augmented Generation with citations)." },
      { type: "feature", description: "Floating assistant widget available across the app, plus a full assistant page with chat history you can revisit or delete." },
      { type: "feature", description: "Choose your AI model — OpenAI, Claude, or Gemini — from a provider switcher, routed securely through the Vercel AI Gateway." },
      { type: "improvement", description: "Answers stream in real time and cite the documents they drew from, so you can verify the source." },
    ],
  },
  {
    version: "1.5.15",
    date: "2026-06-23",
    summary: "Faster loading feedback across the app — a global progress bar and per-card spinners — plus a fix for the Accounts hydration error and Add Entry / Reminders refinements.",
    changes: [
      { type: "feature", description: "Added a thin progress bar at the top of every screen that appears whenever data is loading (YouTube-style), in the app's green accent." },
      { type: "improvement", description: "The top progress bar now also shows during page navigation on every route (link clicks, back/forward, and in-app redirects), not just when data is fetching — so switching pages always gives instant loading feedback." },
      { type: "improvement", description: "Clicking an account card now turns its options (⋮) button into a loading spinner while the account page opens, so it's clear the tap registered." },
      { type: "improvement", description: "On mobile, the Add Entry panel now fills the screen from the top (with a tap-to-close gap above) instead of hugging the bottom, so account/category dropdowns have room to open and the Cancel/Save buttons stay pinned at the bottom." },
      { type: "improvement", description: "Updated the landing page (features, plans, FAQ, and animated headline) to reference 'Reminders' instead of the separate 'To-Buy' and 'To-Do' lists, matching the renamed in-app feature." },
      { type: "fix", description: "Fixed a 'hydration failed' error on the Accounts and account-detail pages. Those pages now read data with useSuspenseQuery so the server and client render identical content on first paint." },
      { type: "fix", description: "In the Add Entry → Transfer panel, the 'From account' and 'To account' dropdowns no longer drift out of alignment — the balance line under 'From account' used to push the 'To account' dropdown down a row. Both columns now pack to the top so the selectors sit on the same line." },
      { type: "fix", description: "The Add Entry panel now reliably autofocuses the Amount field when it opens, instead of occasionally leaving it unfocused. Focus is now hooked to the panel's open event rather than a fixed timer, so it survives the responsive layout switch and the open animation." },
      { type: "fix", description: "Fixed an unnecessary write to the server on every login. Just-loaded preferences were being saved straight back unchanged because the auth/user object updates a couple of times right after sign-in (session re-hydrate and avatar sync). Preferences are now only persisted when their value actually changes." },
    ],
  },
  {
    version: "1.5.14",
    date: "2026-06-13",
    summary: "Account adjustment modal no longer shows long floating-point balances.",
    changes: [
      { type: "fix", description: "The Adjustment modal's New Balance field now prefills the account's current balance rounded to 2 decimal places, instead of a long value like 1234.5599999999999. The computed adjustment difference is also rounded to cents." },
    ],
  },
  {
    version: "1.5.13",
    date: "2026-06-03",
    summary: "To-Do List is now Reminders with category tagging per item.",
    changes: [
      { type: "feature", description: "Renamed 'To-Do List' to 'Reminders' with a new Bell icon across the sidebar and page." },
      { type: "feature", description: "Each reminder item can now be tagged with a category: Meeting, Pantry Items, Errand, Personal, Work, Health, or Other." },
      { type: "improvement", description: "Removed the separate To-Buy page from the sidebar — the /dashboard/to-buy URL now redirects to Reminders." },
      { type: "improvement", description: "New reminder items default to the Personal category instead of Grocery." },
    ],
  },
  {
    version: "1.5.12",
    date: "2026-05-23",
    summary: "Failed auto-debits are now tracked as a first-class status on bills, with daily retries until paid.",
    changes: [
      { type: "feature", description: "When an auto-debit doesn't go through (insufficient balance, missing linked account, or insert failure), the bill now shows a red Failed badge for the month, with the reason on hover." },
      { type: "feature", description: "Failed auto-debits retry automatically on each daily cron run until the bill is paid or the month rolls over — no need to manually re-trigger." },
      { type: "improvement", description: "Bill detail page shows a Failed callout with the specific reason and surfaces failed attempts in the payment history." },
      { type: "improvement", description: "Marking a failed bill as paid (via the list dropdown or the detail page) now replaces the failure with a real payment and creates the linked account transaction." },
      { type: "improvement", description: "Failed bills sort to the top of the list so they're easy to spot and resolve." },
    ],
  },
  {
    version: "1.5.11",
    date: "2026-05-17",
    summary: "Calculators are now a public route — usable without signing in, indexed for search, and still shown inside the dashboard shell for logged-in users.",
    changes: [
      { type: "feature", description: "Tax, Savings, and Debt Payoff calculators now live at /calculators (and /calculators/tax|savings|debt-payoff) so anyone can use them without an account. Old /dashboard/calculators URLs redirect to the new paths." },
      { type: "improvement", description: "When a logged-in user opens /calculators, the page renders inside the dashboard AppShell (sidebar + top bar) — guests get the landing header instead." },
      { type: "feature", description: "Landing page now has a Calculators section (3 cards, one per calculator) styled like the Plans section." },
      { type: "feature", description: "Added /calculators, /calculators/tax, /calculators/savings, and /calculators/debt-payoff to the sitemap so search engines can discover and crawl them. robots.txt already allows the path." },
      { type: "feature", description: "Added an 'id' anchor to every landing section (hero, features, how-it-works, highlights, built-for, subscribe, calculators, reviews, faq, cta) for in-page navigation and SEO." },
      { type: "improvement", description: "How-it-works on the landing page is now four steps: added 'Add your tracked accounts' as step 1, and the reminders step now calls out partial payments and the Partial status badge." },
      { type: "improvement", description: "Sidebar and header search now point to /calculators (and per-calculator routes) instead of the dashboard paths." },
    ],
  },
  {
    version: "1.5.10",
    date: "2026-05-17",
    summary: "Bill list rows cleaned up — all per-row actions moved into a single 3-dot menu.",
    changes: [
      { type: "improvement", description: "Removed the inline Mark Paid / Add Partial buttons and the trailing Edit / Remove icons from each row in the Bills list." },
      { type: "improvement", description: "Added a 3-dot menu on the upper right of each row with: Mark Paid (or Mark Unpaid), Add Partial Payment (or Add to Payment when already partial), Edit, and Remove." },
      { type: "improvement", description: "Reminder label now groups the 'before due date' days together — e.g. '5, 4, 3d before, Due date' instead of '5d before, 4d before, 3d before, Due date' — so the row stays compact on mobile." },
    ],
  },
  {
    version: "1.5.9",
    date: "2026-05-13",
    summary: "Each bill now has its own detail page with payment history and inline edit.",
    changes: [
      { type: "feature", description: "New route /dashboard/bills/[billId] shows amount, due date, linked account/vehicle, reminders, and a full month-by-month payment history. Mirrors the /dashboard/accounts/[accountId] pattern." },
      { type: "feature", description: "Edit button on the detail page opens the same Bill form used by the list — extracted into a shared dialog component so list and detail page stay in sync." },
      { type: "feature", description: "Mark Paid (and Unmark) for the current month is available right on the detail page, with the same insufficient-funds guard the list uses." },
      { type: "feature", description: "Payment history list lets you unmark any past month — the linked account transaction and expense entry are cleaned up via cascade." },
      { type: "improvement", description: "Clicking a row in the Bills list now navigates to the detail page (matches the Accounts list behavior)." },
      { type: "improvement", description: "Added a Pencil button to each row so editing stays one click away from the list view." },
    ],
  },
  {
    version: "1.5.8",
    date: "2026-05-12",
    summary: "Admin notifications: in-app + email channels, HTML editor, templates, batch-send, and one-click unsubscribe.",
    changes: [
      { type: "feature", description: "Admin → Notifications now has a Delivery selector: In-app, Email, or Both." },
      { type: "feature", description: "Email body editor with toolbar (bold, italic, headings, lists, links), HTML source toggle, and live preview." },
      { type: "feature", description: "Built-in notification templates (Track your finances, Month-end review, Bills check-in) — one click fills title, in-app body, and email HTML." },
      { type: "fix", description: "Bulk broadcast emails now use Resend's batch API (up to 100 per request). Previous per-recipient parallel calls hit rate limits on larger user lists." },
      { type: "feature", description: "Every broadcast and reminder email now includes a signed one-click Unsubscribe link in the footer, plus List-Unsubscribe / List-Unsubscribe-Post headers for Gmail/Outlook native support." },
      { type: "feature", description: "GET /api/unsubscribe processes unsubscribe clicks — verifies a per-user HMAC token and sets email_unsubscribed on the profile. Unsubscribed users are excluded from all future non-transactional emails." },
    ],
  },
  {
    version: "1.5.7",
    date: "2026-05-08",
    summary: "Unified expense dialogs with required account, bank logo, and balance validation.",
    changes: [
      { type: "improvement", description: "Adjustment modal now takes a 'Current Balance' input instead of add/subtract direction buttons — the delta is computed and recorded automatically." },
      { type: "improvement", description: "Live adjustment preview shown below the input (e.g. Adjustment +₱500 or Adjustment −₱200)." },
      { type: "improvement", description: "Description field renamed to Notes in the Adjustment modal." },
      { type: "improvement", description: "Transfer destination is now a dropdown showing each account's bank logo, name, and current balance." },
      { type: "feature", description: "Optional Transfer Fee field added — when provided, a separate expense entry is recorded on the source account." },
      { type: "fix", description: "Account cards now show an external link icon on hover instead of edit/delete buttons (edit/delete moved to the account detail page)." },
      { type: "fix", description: "Resolved browser warning about missing aria-describedby on dialog components." },
      { type: "improvement", description: "Account is now required when adding or editing an expense — expenses must always be linked to an account." },
      { type: "improvement", description: "Account dropdown in Add/Edit Expense now shows the bank logo alongside the account name." },
      { type: "improvement", description: "Available balance is displayed below the account selector; saving is blocked if the expense exceeds the balance." },
      { type: "feature", description: "Saving an expense with a linked account creates an account transaction to deduct the amount from the balance (Expenses page and Account detail page both do this)." },
      { type: "improvement", description: "Add and Edit Expense modals on the Expenses page now use the same shared components as the Account detail page." },
    ],
  },
  {
    version: "1.5.6",
    date: "2026-05-07",
    summary: "Account modal improvements: interest rate, maintaining balance, warning indicators.",
    changes: [
      { type: "improvement", description: "Account Type field changed from button grid to a dropdown with Debit as default." },
      { type: "improvement", description: "Starting Balance is now on the left and Currency on the right in the modal layout." },
      { type: "feature", description: "Interest Rate (%) field added beside Interest Frequency — disabled until a frequency is selected." },
      { type: "feature", description: "Maintaining Balance (optional) field added to the account form to set a minimum balance threshold." },
      { type: "feature", description: "Warning icon shown on account cards and the account detail page when the balance drops below the maintaining balance." },
    ],
  },
  {
    version: "1.5.5",
    date: "2026-05-07",
    summary: "Account list redesigned as cards; currency field added to accounts; bank logos in modal.",
    changes: [
      { type: "feature", description: "Added a Currency field to the Add/Edit Account modal (PHP, USD, EUR, and 15 others). Each account balance is now formatted in its own currency." },
      { type: "improvement", description: "Account list on /dashboard/accounts is now a 3-column card grid on desktop and 1 column on mobile. Each card shows the bank logo, account alias, type • currency, tags, and balance." },
      { type: "improvement", description: "Bank and e-wallet logos are now displayed in the account form dropdown and trigger for all institutions that have a logo." },
      { type: "improvement", description: "Moved 'Other' to the last position in the bank/e-wallet dropdown." },
      { type: "improvement", description: "Account cards now have a color-tinted border and a diagonal gradient overlay derived from each account's color." },
      { type: "improvement", description: "Cash account default color changed to sky blue (#0ea5e9) — migration updates existing accounts and the new-user trigger." },
      { type: "fix", description: "Bank logo lookup is now case-insensitive and ignores spaces, fixing Maribank and other edge-case spellings." },
    ],
  },
  {
    version: "1.5.4",
    date: "2026-05-05",
    summary: "Net Balance chart on /dashboard/accounts rebuilt on visx for crisper rendering, smoother hover interactions, and a richer themed tooltip.",
    changes: [
      { type: "improvement", description: "Replaced the recharts-based 7-day Net Balance line chart with a visx implementation: smooth monotone curve, area gradient fill, themed grid, dashed crosshair, and a portal tooltip that follows the pointer." },
    ],
  },
  {
    version: "1.5.3",
    date: "2026-05-04",
    summary: "Cash is now a real per-user account; click an account to open its detail page. Per-account ledger: log expense, income, adjustment, and transfer entries on each account with a running balance and history.",
    changes: [
      { type: "feature", description: "Every new user now starts with a real 'Cash' account auto-created alongside their profile. Existing users have a Cash account backfilled, and prior references to the static Cash UUID are migrated to the real per-user account." },
      { type: "improvement", description: "Removed the built-in Cash and Borrowed placeholder accounts from /dashboard/accounts. Every account on the list is now a real DB row that can be edited, tagged, recolored, or deleted." },
      { type: "feature", description: "Clicking an account on /dashboard/accounts now opens a per-account detail page at /dashboard/accounts/[accountId] — the future home for that account's expense, income, transfer, and adjustment entries. A separate edit (pencil) icon keeps editing one click away from the list." },
      { type: "feature", description: "Each account at /dashboard/accounts/[accountId] now has its own ledger. Add Expense, Add Income, Adjustment, and Transfer to another account directly on the wallet page. The current balance is computed from these entries (independent of expenses or bills that merely tag the account)." },
      { type: "feature", description: "Transfers create a paired entry on both accounts so balances stay in sync. Deleting one leg of a transfer deletes the other automatically." },
      { type: "feature", description: "Account history list with per-entry delete. Adjustments support both 'add to balance' and 'subtract from balance' directions." },
      { type: "improvement", description: "Edit and Delete buttons for the account itself now live in the top-right of the account detail page. Confirm dialogs replace inline prompts." },
      { type: "improvement", description: "Extracted the Account form dialog into a shared component reused by /dashboard/accounts and the account detail page." },
      { type: "improvement", description: "Accounts list now shows each account's live balance computed from its own ledger entries instead of summed expense/bill totals tagged to it. The 'This Month' card became 'Total Balance', the chart shows balance distribution across accounts, and balances reset to zero until you add ledger entries." },
      { type: "feature", description: "Add/Edit Account dialog now captures Account Type (Debit, Credit, Stocks, Crypto), Starting Balance, Interest Frequency (none / daily / weekly / monthly / quarterly / annually), and an 'Include in Net Balance' toggle." },
      { type: "improvement", description: "Account balances now use Starting Balance as the seed value: balance = starting_balance + sum(account_transactions). Visible on both the accounts list and the per-account detail page." },
      { type: "feature", description: "Replaced the 'Total Balance' stat on /dashboard/accounts with 'Net Balance', summed across only the accounts where 'Include in Net Balance' is enabled. The card shows how many accounts are counted." },
      { type: "feature", description: "Replaced the per-account distribution donut chart with a 7-day Net Balance line chart driven by a new server-side loader that reconstructs end-of-day net balance for each of the last 7 days." },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-04",
    summary: "New Receivables tracker — track money owed to you with account linking and email confirmations.",
    changes: [
      {
        type: "feature",
        description: "New Receivables page (/dashboard/receivables): track money owed to you (IOUs, cash loans, shared bills) with debtor name, description, total amount, amount paid back, category, date lent, and due date.",
      },
      {
        type: "feature",
        description: "Status tabs on Receivables: Unpaid, Partial, and Collected — with a quick-toggle checkmark on each row to mark fully paid or reset to unpaid.",
      },
      {
        type: "feature",
        description: "Summary stat cards: Total Owed, Collected, and Outstanding balance across all receivables.",
      },
      {
        type: "feature",
        description: "Account linking: invite the debtor by email from inside the edit dialog. They receive an email showing the amount claimed and a Confirm / Decline button.",
      },
      {
        type: "feature",
        description: "Invite accept page (/dashboard/receivables/invite/[token]): the invited user can confirm they owe the amount or decline. Email mismatch is enforced so only the invited address can respond.",
      },
      {
        type: "feature",
        description: "Pending confirmation banner: if another user has invited you to confirm a debt, a yellow banner appears at the top of your Receivables page with a direct Review link.",
      },
    ],
  },
  {
    version: "1.4.24",
    date: "2026-05-04",
    summary: "Expenses and Bills: collapsible spending-by-category chart on small screens.",
    changes: [
      {
        type: "improvement",
        description:
          "On /dashboard/expenses, the Spending by category card is collapsed by default below the sm breakpoint; tap the card header (chevron on the right) to expand and show the chart or empty state. Tablet and desktop keep the chart visible with a static header.",
      },
      {
        type: "improvement",
        description:
          "On /dashboard/bills, the same Spending by category header + chevron collapse behavior applies on mobile, with the shared collapsible card component used by both pages.",
      },
      {
        type: "improvement",
        description:
          "Restructured the Add/Edit Expense modals so the title and close (X) button stay pinned at the top and Cancel/Save stay pinned at the bottom while the form body scrolls — matches the Bill modal layout. Mobile users can no longer lose access to the title or action buttons when the on-screen keyboard opens.",
      },
    ],
  },
  {
    version: "1.4.23",
    date: "2026-05-04",
    summary: "Vehicles spend chart uses grouped category bars. Transport bills linked to a vehicle require a vehicle category.",
    changes: [
      {
        type: "improvement",
        description:
          "On /dashboard/vehicles, the spend-by-vehicle bar chart now draws Fuel, Fees, Maintenance, Insurance, Other, and Bills as side-by-side bars per vehicle instead of a single stacked column.",
      },
      {
        type: "fix",
        description:
          "Logging, editing, or deleting an expense in the Transport & Commute category now invalidates React Query caches for the Vehicles page so linked per-vehicle spending refreshes without a full reload.",
      },
      {
        type: "feature",
        description:
          "Bills in Transport & Commute now mirror Expenses: when you link a vehicle, choosing a vehicle category (Fuel, Fees, Maintenance & Repairs, Insurance & Registration) is required before saving.",
      },
      {
        type: "improvement",
        description:
          "Vehicle spending charts treat categorized transport bills like categorized expenses (legacy bill rows without a vehicle category still roll into Bills).",
      },
    ],
  },
  {
    version: "1.4.22",
    date: "2026-05-04",
    summary: "Fix expense modals on mobile; category selects now default to blank placeholder.",
    changes: [
      { type: "fix", description: "Add and edit expense modals on mobile no longer push the name input off-screen or hide the Cancel/Save buttons when the keyboard opens. Dialogs are now scrollable with a sticky footer." },
      { type: "fix", description: "Category dropdowns on mobile no longer clip options outside the viewport; the list now respects available screen height." },
      { type: "improvement", description: "Add and edit category dropdowns for expenses and bills now show 'Select category' placeholder instead of defaulting to a category." },
      { type: "improvement", description: "Moved Accounts from the sidebar footer into the main nav, right after Dashboard, so it sits with the other primary destinations." },
      { type: "improvement", description: "Aligned the Accounts icon to the wallet icon used by the mobile bottom navbar, both in the sidebar and on the Accounts page header." },
      { type: "improvement", description: "Clarified the Accounts page subtitle to explain that this is the hub for recording expenses, income, transfers, and adjustments." },
      { type: "fix", description: "Fixed recoverable SSR error on /dashboard/accounts caused by accountsQueryOptions and accountTotalsQueryOptions calling Server Actions during initial render — the page now prefetches and dehydrates both queries on the server so useSuspenseQuery reads from the hydrated cache instead of firing the queryFn during SSR." },
    ],
  },
  {
    version: "1.4.21",
    date: "2026-05-04",
    summary: "Vehicles page redesign with expense categories, animated stat cards, and SSR fixes.",
    changes: [
      { type: "improvement", description: "Renamed 'Fuel & Vehicles' to 'Vehicles' and moved to /dashboard/vehicles; old /dashboard/fuel redirects automatically." },
      { type: "feature", description: "Added month/year selector on the Vehicles page to filter spending by selected month." },
      { type: "feature", description: "Added vehicle expense categories — Fuel, Fees (Parking, Toll, etc.), Maintenance & Repairs, and Insurance & Registration." },
      { type: "improvement", description: "When a transport expense is linked to a vehicle, a Vehicle Category is now required to better classify the spend." },
      { type: "improvement", description: "Dashboard, Expenses, and Bills pages now render stat cards and charts immediately — currency amounts animate from ₱0 to their real values as data loads, and the list shows the OmniTrak breathing logo until ready." },
      { type: "fix", description: "Fixed recoverable SSR waterfall error on /dashboard/bills caused by billsDataQueryOptions and userPreferencesQueryOptions calling Server Actions during initial render — switched to useQuery so the queryFn only runs client-side in effects." },
      { type: "improvement", description: "Extracted AnimatedAmount (with optional currency prop) and useCountUp into a shared ui component for reuse across pages." },
      { type: "fix", description: "Prefetch the subscription plan in the dashboard layout so the client cache is hydrated before render — eliminates the 'Server Functions cannot be called during initial render' recoverable error." },
    ],
  },
  {
    version: "1.4.20",
    date: "2026-05-03",
    summary: "Privacy settings page and Bills renamed to Bills.",
    changes: [
      { type: "feature", description: "Added /account/privacy page with profile visibility settings — toggle whether other subdivision members can see your name/avatar or phone number." },
      { type: "feature", description: "Added account self-deletion from the Privacy danger zone with a confirmation dialog." },
      { type: "improvement", description: "Privacy link in the account dropdown menu now navigates to the dedicated /account/privacy settings page instead of the legal hub." },
      { type: "improvement", description: "Renamed the Bills feature to Bills app-wide — navigation, page titles, form dialogs, stat labels, search index, and all marketing copy updated." },
      { type: "improvement", description: "Route changed from /dashboard/bills to /dashboard/bills." },
      { type: "improvement", description: "Form field 'Billing Period' renamed to 'Recurrence' for clarity." },
    ],
  },
  {
    version: "1.4.19",
    date: "2026-05-03",
    summary: "Goals savings targets, deposit tracking, confirmation dialog, and mobile navbar update.",
    changes: [
      { type: "feature", description: "Goals can now have an optional target amount so you can set a savings objective." },
      { type: "feature", description: "Added deposit tracking — log individual contributions towards any goal with an amount, date, and optional note." },
      { type: "feature", description: "Progress bar on each goal card shows how much has been saved vs. the target, with a 'Funded!' badge when the goal is fully reached." },
      { type: "feature", description: "Deposit history is viewable and manageable inside the goal edit dialog, including individual deposit deletion." },
      { type: "feature", description: "Quick 'Add Deposit' action available from the goal card dropdown menu." },
      { type: "feature", description: "New ConfirmDialog component replaces all native browser confirm() calls with a consistent modal." },
      { type: "improvement", description: "Add Deposit button now appears inline next to Target Amount in the Edit Goal dialog for quicker access." },
      { type: "improvement", description: "Edit Goal dialog header now shows the goal name and target amount as a subtitle for quick context." },
      { type: "improvement", description: "Replaced the Fuel shortcut in the mobile bottom navbar with Category, linking to the expense categories page." },
      { type: "improvement", description: "Bank / E-Wallet options in the account add/edit dialog are now sorted alphabetically for faster scanning." },
      { type: "improvement", description: "Added a search input inside the bank dropdown so users can filter institutions while selecting." },
    ],
  },
  {
    version: "1.4.18",
    date: "2026-05-01",
    summary: "Accounts now show institution logo badges and include Maribank in bank options.",
    changes: [
      { type: "improvement", description: "Added institution logo badges before each account name in the Accounts list for quicker visual scanning." },
      { type: "improvement", description: "Added Maribank to the Bank / E-Wallet dropdown options in the account add/edit dialog." },
    ],
  },
  {
    version: "1.4.17",
    date: "2026-05-01",
    summary: "Dashboard Bills stat now counts only bills applicable to the active month.",
    changes: [
      { type: "fix", description: "Dashboard Bills, Bills paid, and Bills + Expenses cards now exclude bills outside the current paid month context (including quarterly/yearly off-month and inactive date ranges)." },
    ],
  },
  {
    version: "1.4.16",
    date: "2026-05-01",
    summary: "Bills page now supports month-based review like the Expenses page.",
    changes: [
      { type: "improvement", description: "Added a month selector on /dashboard/bills with the current month as default and recent-month options, matching the Expenses page flow." },
      { type: "fix", description: "Bill due-date/status calculations for yearly and quarterly bills now follow the selected paid month context instead of always using the current month." },
    ],
  },
  {
    version: "1.4.15",
    date: "2026-05-01",
    summary: "Dashboard Bills Paid bar now refreshes correctly after chart data shape update.",
    changes: [
      { type: "fix", description: "Versioned the monthly breakdown React Query key to invalidate stale cached chart rows and ensure the new Bills Paid series is fetched and displayed." },
    ],
  },
  {
    version: "1.4.14",
    date: "2026-05-01",
    summary: "Dashboard monthly bar chart now includes a Bills Paid series.",
    changes: [
      { type: "improvement", description: "Dashboard chart updated to Bills vs Bills Paid vs Expenses vs Savings, with Bills Paid computed from monthly non-savings bills marked paid per month." },
    ],
  },
  {
    version: "1.4.13",
    date: "2026-05-01",
    summary: "Dashboard expense stat cards now reflect paid entries for the active month.",
    changes: [
      { type: "fix", description: "Dashboard 'Expenses' and 'Bills + Expenses' cards now total only paid daily expenses for the current paid month, preventing prior-month carryover." },
    ],
  },
  {
    version: "1.4.12",
    date: "2026-04-30",
    summary: "Mobile responsiveness improvements across the bottom navbar, insight popup, and expense form.",
    changes: [
      { type: "improvement", description: "Bottom navbar now shows Fuel and Accounts instead of To Buy and To Do, reflecting the most-used top-level destinations." },
      { type: "improvement", description: "Insight popup repositioned above the mobile bottom navbar and scaled down with smaller text and padding on small screens." },
      { type: "improvement", description: "Expense name and amount inputs on the expenses board now use a larger base font size on mobile to match native input styling." },
    ],
  },
  {
    version: "1.4.11",
    date: "2026-04-30",
    summary: "Expanded bill reminder day options and fixed setup wizard user refresh.",
    changes: [
      { type: "improvement", description: "Bill reminders now support all days 1–5 before the due date (previously only 3 days, 1 day, and on due date were available). UI labels updated to compact format (5d, 4d, etc.)." },
      { type: "fix", description: "Setup wizard now refreshes the user session after saving the profile step, preventing stale user data when continuing to the next step." },
      { type: "fix", description: "Select dropdowns now cap their height to the available viewport space instead of a fixed 384px, preventing overflow on small screens." },
    ],
  },
  {
    version: "1.4.10",
    date: "2026-04-30",
    summary: "Fixed expense edit dialog not saving; category selects now default to blank placeholder.",
    changes: [
      { type: "fix", description: "Expense edit modal Save button was outside the form element, preventing any edits from being submitted." },
      { type: "improvement", description: "Add and edit category dropdowns for expenses and bills now show 'Select category' placeholder instead of defaulting to a category. Expenses previously set to 'Other' also open with the placeholder." },
    ],
  },
  {
    version: "1.4.9",
    date: "2026-04-29",
    summary: "Fixed quarterly and yearly bill reminders firing in wrong months; improved savings calculation.",
    changes: [
      { type: "fix", description: "Yearly bills now only trigger reminders in their configured due month — no longer fires every month near the due day." },
      { type: "fix", description: "Quarterly bills now only trigger reminders in the correct calendar quarter months (Jan/Apr/Jul/Oct), not every month." },
      { type: "improvement", description: "Savings in Bills vs Expenses vs Savings chart now counts expense entries categorized as savings created this month, plus bills with savings category marked paid this month." },
    ],
  },
  {
    version: "1.4.8",
    date: "2026-04-29",
    summary: "New user onboarding setup wizard after email confirmation.",
    changes: [
      { type: "feature", description: "New signup onboarding wizard guides users through setting their name, goals, first expense, and first bill to track — all skippable." },
      { type: "improvement", description: "After confirming their email, new users land on the /setup page instead of jumping straight to the dashboard." },
      { type: "improvement", description: "Returning users who already completed setup are automatically redirected to the dashboard." },
    ],
  },
  {
    version: "1.4.7",
    date: "2026-04-29",
    summary: "Minor bug fixes and performance improvements.",
    changes: [
      { type: "fix", description: "Fixed a bug where the dashboard insight popup could reappear after being closed if the user navigated away and back to the dashboard within the same session." },
      { type: "fix", description: "Resolved an issue where the built-in Cash and Borrowed accounts could sometimes fail to load on initial login, causing them not to appear on the Accounts page." },
      { type: "improvement", description: "Optimized the loading of the changelog page by lazy-loading older entries and only rendering the most recent 5 entries on initial load." },
    ],
  },
  {
    version: "1.4.6",
    date: "2026-04-28",
    summary: "Pro/Premium users can now create custom expense categories.",
    changes: [
      { type: "feature", description: "Pro and Premium users can create, edit, and delete their own custom expense categories from /dashboard/expenses/categories." },
      { type: "improvement", description: "Custom categories appear first on the Expense Categories page, above the standard built-in categories." },
      { type: "improvement", description: "Custom categories are included in expense dropdowns so they can be assigned to expenses immediately after creation." },
      { type: "improvement", description: "Added 'Custom expense categories' to Pro plan benefits on the subscription and landing pages." },
      { type: "fix", description: "Corrected the search index URL for Expense Categories to /dashboard/expenses/categories." },
    ],
  },
  {
    version: "1.4.5",
    date: "2026-04-28",
    summary: "Add/Edit Bill modal now matches the expense modal UX.",
    changes: [
      { type: "improvement", description: "Bill dialog now uses a proper form element — pressing Enter submits the form." },
      { type: "improvement", description: "Name field auto-focuses when the dialog opens." },
      { type: "improvement", description: "Edit Bill dialog now has an inline Delete button in the footer, matching the expense modal." },
      { type: "fix", description: "End Date picker no longer allows selecting future months or dates." },
    ],
  },
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
    summary: "Bills page smart defaults, correct outstanding logic, and reminder cap for free users.",
    changes: [
      { type: "improvement", description: "Add Bill dialog auto-selects the billing period matching the active tab (quarterly or yearly)." },
      { type: "fix", description: "Quarterly bills now show outstanding based on the current quarter's due date, not the current month." },
      { type: "fix", description: "Yearly bills now show outstanding based on the bill's due month in the current year, not the current month." },
      { type: "improvement", description: "Quarterly bill due date label now shows Q1–Q4 and the quarter's start month (e.g. Q2 • Apr 15)." },
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
