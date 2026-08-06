export type SearchItem = {
  title: string;
  href: string;
  group: string;
  keywords?: string[];
};

export const SEARCH_INDEX: SearchItem[] = [
  // ── Navigation ──────────────────────────────────────────────────────────
  { title: "Dashboard", href: "/dashboard", group: "Navigation", keywords: ["home", "overview", "cashflow", "summary", "monthly", "main"] },
  { title: "Ask AI", href: "/dashboard/assistant", group: "Navigation", keywords: ["ai", "assistant", "chat", "chatbot", "ask", "rag", "documents", "knowledge base", "gpt", "claude", "gemini", "ask omnitrak", "insights", "advisor"] },
  { title: "Expenses", href: "/dashboard/expenses", group: "Navigation", keywords: ["spending", "cost", "money", "track", "my expenses", "expense list"] },
  { title: "Planned Expenses", href: "/dashboard/planned-expenses", group: "Navigation", keywords: ["due date", "payment", "monthly", "recurring", "utility", "bills", "planned expenses"] },
  { title: "Receivables", href: "/dashboard/receivables", group: "Navigation", keywords: ["owed", "iou", "lent", "debt", "borrow", "loan", "collect", "money owed", "receivable", "payable", "owes me"] },
  { title: "Accounts", href: "/dashboard/accounts", group: "Navigation", keywords: ["bank", "wallet", "bdo", "bpi", "gcash", "maya", "account", "label", "tag", "fund"] },
  { title: "Goals", href: "/dashboard/goals", group: "Navigation", keywords: ["savings", "target", "milestone", "financial goal", "my goals", "short term", "long term"] },
  { title: "Reminders", href: "/dashboard/to-do", group: "Navigation", keywords: ["tasks", "checklist", "todo", "task list", "reminders", "meeting", "pantry", "errand", "personal", "work"] },
  { title: "Vehicles", href: "/dashboard/vehicles", group: "Navigation", keywords: ["vehicle", "car", "motorcycle", "fuel", "gas", "transport", "gasoline", "diesel", "plate", "mileage", "vehicle tracker", "maintenance", "parking", "toll", "insurance", "registration"] },
  { title: "Calculators", href: "/calculators", group: "Navigation", keywords: ["math", "compute", "calculate", "financial calculator", "tools"] },
  { title: "Refer & Earn", href: "/dashboard/referrals", group: "Navigation", keywords: ["referral", "referrals", "refer", "invite", "invite friends", "share", "share link", "invite link", "referral code", "free pro", "free month", "reward", "rewards", "affiliate", "earn"] },
  { title: "Review & Feedback", href: "/dashboard/feedback", group: "Navigation", keywords: ["review", "feedback", "suggestions", "rate", "report", "suggest"] },
  { title: "What's New", href: "/changelog", group: "Navigation", keywords: ["changelog", "release notes", "updates", "version", "bugfix", "hotfix", "new features", "whats new"] },

  // ── Calculators ──────────────────────────────────────────────────────────
  { title: "Debt Payoff Calculator", href: "/calculators/debt-payoff", group: "Calculators", keywords: ["loan", "debt", "payoff", "amortization", "interest", "monthly payment", "installment"] },
  { title: "Savings Calculator", href: "/calculators/savings", group: "Calculators", keywords: ["savings", "interest", "compound", "future value", "investment", "earn"] },
  { title: "Tax Calculator", href: "/calculators/tax", group: "Calculators", keywords: ["tax", "income tax", "BIR", "TRAIN law", "SSS", "PhilHealth", "Pag-IBIG", "contributions", "take-home", "net pay", "salary", "withholding"] },

  // ── Expenses sub ─────────────────────────────────────────────────────────
  { title: "Expense Categories", href: "/dashboard/expenses/categories", group: "Expenses", keywords: ["category", "organize", "type", "label", "food", "utilities", "rent", "transport", "groups", "custom category", "my categories"] },

  // ── Premium features ─────────────────────────────────────────────────────
  { title: "Rent Tracker", href: "/dashboard/rent-tracker", group: "Premium", keywords: ["rent", "landlord", "tenant", "property", "lease", "apartment", "house rental"] },
  { title: "Payment Tracker", href: "/dashboard/payment-tracker", group: "Premium", keywords: ["payment", "track payments", "receivables", "pay", "owed", "collected"] },

  // ── Account ───────────────────────────────────────────────────────────────
  { title: "Profile", href: "/account/profile", group: "Account", keywords: ["name", "avatar", "photo", "personal info", "full name", "picture"] },
  { title: "Security", href: "/account/security", group: "Account", keywords: ["password", "two factor", "2fa", "login security", "change password", "auth"] },
  { title: "Privacy", href: "/account/privacy", group: "Account", keywords: ["visibility", "profile visibility", "phone visibility", "data", "delete account", "export data", "members"] },
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
