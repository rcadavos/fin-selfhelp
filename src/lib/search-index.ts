export type SearchItem = {
  title: string;
  href: string;
  group: string;
  keywords?: string[];
};

export const SEARCH_INDEX: SearchItem[] = [
  // ── Navigation ──────────────────────────────────────────────────────────
  { title: "Dashboard", href: "/dashboard", group: "Navigation", keywords: ["home", "overview", "cashflow", "summary", "monthly", "main"] },
  { title: "Expenses", href: "/dashboard/expenses", group: "Navigation", keywords: ["spending", "cost", "money", "track", "my expenses", "expense list"] },
  { title: "Bills", href: "/dashboard/bills", group: "Navigation", keywords: ["due date", "payment", "monthly", "recurring", "utility", "bill list"] },
  { title: "Goals", href: "/dashboard/goals", group: "Navigation", keywords: ["savings", "target", "milestone", "financial goal", "my goals", "short term", "long term"] },
  { title: "To-Buy List", href: "/dashboard/to-buy", group: "Navigation", keywords: ["shopping", "purchase", "wishlist", "buy", "grocery", "items"] },
  { title: "To-Do List", href: "/dashboard/to-do", group: "Navigation", keywords: ["tasks", "checklist", "todo", "task list"] },
  { title: "Calculators", href: "/dashboard/calculators", group: "Navigation", keywords: ["math", "compute", "calculate", "financial calculator", "tools"] },
  { title: "Review & Feedback", href: "/dashboard/feedback", group: "Navigation", keywords: ["review", "feedback", "suggestions", "rate", "report", "suggest"] },
  { title: "What's New", href: "/changelog", group: "Navigation", keywords: ["changelog", "release notes", "updates", "version", "bugfix", "hotfix", "new features", "whats new"] },

  // ── Calculators ──────────────────────────────────────────────────────────
  { title: "Debt Payoff Calculator", href: "/dashboard/calculators/debt-payoff", group: "Calculators", keywords: ["loan", "debt", "payoff", "amortization", "interest", "monthly payment", "installment"] },
  { title: "Savings Calculator", href: "/dashboard/calculators/savings", group: "Calculators", keywords: ["savings", "interest", "compound", "future value", "investment", "earn"] },

  // ── Expenses sub ─────────────────────────────────────────────────────────
  { title: "Expense Categories", href: "/dashboard/my-expenses/categories", group: "Expenses", keywords: ["category", "organize", "type", "label", "food", "utilities", "rent", "transport", "groups"] },

  // ── Premium features ─────────────────────────────────────────────────────
  { title: "Rent Tracker", href: "/dashboard/rent-tracker", group: "Premium", keywords: ["rent", "landlord", "tenant", "property", "lease", "apartment", "house rental"] },
  { title: "Payment Tracker", href: "/dashboard/payment-tracker", group: "Premium", keywords: ["payment", "track payments", "receivables", "pay", "owed", "collected"] },

  // ── Account ───────────────────────────────────────────────────────────────
  { title: "Profile", href: "/account/profile", group: "Account", keywords: ["name", "avatar", "photo", "personal info", "full name", "picture"] },
  { title: "Security", href: "/account/security", group: "Account", keywords: ["password", "two factor", "2fa", "login security", "change password", "auth"] },
  { title: "Subscription & Billing", href: "/account/subscription", group: "Account", keywords: ["plan", "pro", "premium", "billing", "payment", "upgrade", "subscribe", "free", "tier"] },
  { title: "Settings", href: "/account/settings", group: "Account", keywords: ["preferences", "currency", "format", "locale", "date format", "language", "config"] },
  { title: "Shared with me", href: "/account/shared", group: "Account", keywords: ["partner", "share", "access", "collaborate", "shared expenses", "invite"] },
  { title: "Notifications", href: "/account/notifications", group: "Account", keywords: ["alerts", "reminders", "email notifications", "push", "notify"] },

  // ── Legal ─────────────────────────────────────────────────────────────────
  { title: "Privacy Policy", href: "/legal/privacy", group: "Legal", keywords: ["privacy", "data protection", "personal data", "gdpr"] },
  { title: "Terms of Service", href: "/legal/terms", group: "Legal", keywords: ["terms", "conditions", "agreement", "tos"] },
  { title: "Cookie Policy", href: "/legal/cookies", group: "Legal", keywords: ["cookies", "tracking", "consent"] },
];

export function searchItems(query: string, limit = 8): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = SEARCH_INDEX.map((item) => {
    const title = item.title.toLowerCase();
    const keys = (item.keywords ?? []).join(" ").toLowerCase();
    const group = item.group.toLowerCase();

    let score = 0;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if (keys.split(" ").some((k) => k.startsWith(q))) score = 50;
    else if (keys.includes(q)) score = 40;
    else if (group.startsWith(q)) score = 25;
    else if (group.includes(q)) score = 15;

    return { item, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
