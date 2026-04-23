export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExpenseCategoryKey =
  | "grocery"
  | "transport"
  | "utilities"
  | "insurance"
  | "loans"
  | "savings"
  | "rent"
  | "food_dining"
  | "health"
  | "education"
  | "personal"
  | "credit_card"
  | "gaming"
  | "home_maintenance"
  | "subscription"
  | "other";

export type ExpenseCategory = {
  id: ExpenseCategoryKey;
  label: string;
  description?: string;
  lists?: string[];
  /** Tailwind class for light background (e.g. bg-amber-100) */
  bgClass: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "grocery",
    label: "Grocery",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    description: "Day-to-day food and household items from the supermarket or palengke.",
    lists: ["Rice & grains", "Vegetables & fruits", "Meat & poultry", "Dairy & eggs", "Canned & packed goods", "Cleaning & household supplies"],
  },
  {
    id: "transport",
    label: "Transport & Commute",
    bgClass: "bg-sky-50 dark:bg-sky-950/30",
    description: "Getting around — whether by commute, ride-share, or your own vehicle.",
    lists: ["Jeepney / bus fare", "MRT / LRT load", "Grab / taxi", "Gasoline & parking", "Car maintenance", "Motorcycle expenses"],
  },
  {
    id: "utilities",
    label: "Utilities (Electric, Water, Internet)",
    bgClass: "bg-slate-50 dark:bg-slate-800/30",
    description: "Monthly services that keep your home running.",
    lists: ["Electricity (Meralco)", "Water (Manila Water / Maynilad)", "Internet & cable", "Mobile load & data", "Gas / LPG"],
  },
  {
    id: "insurance",
    label: "Insurance",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    description: "Protection policies covering health, life, property, or vehicles.",
    lists: ["HMO / health card", "Life insurance premium", "Car insurance", "Home / property insurance", "SSS / PhilHealth / Pag-IBIG contributions"],
  },
  {
    id: "loans",
    label: "Loans & Debts",
    bgClass: "bg-rose-50 dark:bg-rose-950/30",
    description: "Regular amortization or repayments on borrowed money.",
    lists: ["SSS / Pag-IBIG loan", "Bank personal loan", "Cash advance", "Salary loan", "Car loan amortization", "Gadget / appliance installment"],
  },
  {
    id: "savings",
    label: "Savings & Investments",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    description: "Money set aside or put to work for future goals.",
    lists: ["Emergency fund", "Time deposit", "MP2 / Pag-IBIG Fund", "Stock market / UITFs", "Crypto & other investments", "Goal savings"],
  },
  {
    id: "rent",
    label: "Rent / Mortgage",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
    description: "Housing cost — whether you're renting or paying off a property.",
    lists: ["Monthly rent", "Condo dues / association fee", "Pag-IBIG / bank home loan", "Security deposit", "Homeowners insurance"],
  },
  {
    id: "food_dining",
    label: "Food & Dining Out",
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
    description: "Meals and drinks outside the home — restaurants, cafés, and delivery.",
    lists: ["Restaurant meals", "Café & coffee", "Fast food", "Food delivery (Grab, Foodpanda)", "Office lunch & snacks", "Desserts & drinks"],
  },
  {
    id: "health",
    label: "Health & Medical",
    bgClass: "bg-teal-50 dark:bg-teal-950/30",
    description: "Staying healthy — medical visits, medicines, and wellness.",
    lists: ["Doctor consultation", "Medicines & vitamins", "Laboratory & diagnostics", "Hospital bills", "Dental & optical", "Gym & fitness membership"],
  },
  {
    id: "education",
    label: "Education",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/30",
    description: "Learning costs for school, upskilling, or professional development.",
    lists: ["Tuition & school fees", "School supplies & books", "Uniform & ID", "Online courses & e-learning", "Tutorial / review classes", "School allowance"],
  },
  {
    id: "personal",
    label: "Personal & Grooming",
    bgClass: "bg-pink-50 dark:bg-pink-950/30",
    description: "Personal care and lifestyle items for looking and feeling good.",
    lists: ["Haircut / salon", "Skincare & beauty products", "Toiletries", "Clothing & shoes", "Laundry", "Personal accessories"],
  },
  {
    id: "credit_card",
    label: "Credit Card",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/30",
    description: "Credit card monthly statement payment.",
    lists: ["Minimum amount due", "Full statement balance", "Installment payment", "Annual fee", "Interest & late charges", "Cash advance fee"],
  },
  {
    id: "gaming",
    label: "Gaming Expenses",
    bgClass: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    description: "Games, in-app purchases, and entertainment platforms.",
    lists: ["Mobile top-ups & gems", "PC / console games", "PlayStation Plus / Xbox Game Pass", "In-game items & skins", "Gaming peripherals", "Streaming game services"],
  },
  {
    id: "home_maintenance",
    label: "Home Maintenance",
    bgClass: "bg-lime-50 dark:bg-lime-950/30",
    description: "Keeping your home in good shape — repairs, tools, and improvements.",
    lists: ["Plumbing repairs", "Electrical work", "Painting & renovation", "Appliance repair", "Pest control", "Furniture & fixtures"],
  },
  {
    id: "subscription",
    label: "Subscription",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    description: "Recurring digital subscriptions and service memberships.",
    lists: ["Netflix / Viu / Disney+", "Spotify / Apple Music", "Cloud storage (Google One, iCloud)", "Software licenses (Microsoft 365, Adobe)", "News & magazines", "YouTube Premium"],
  },
  {
    id: "other",
    label: "Other",
    bgClass: "bg-neutral-50 dark:bg-neutral-800/30",
    description: "Miscellaneous expenses that do not fit neatly elsewhere.",
    lists: ["Cash gifts & donations", "Parties & celebrations", "Pet expenses", "Travel & vacation", "Bank fees & charges", "Miscellaneous purchases"],
  },
];

export type BudgetSummary = {
  netTakeHome: number;
  totalExpenses: number;
  balance: number;
  status: "overdraft" | "extra" | "break_even";
  byCategory: { categoryId: string; label: string; amount: number }[];
};

export type BudgetState = {
  netTakeHome: number;
  expenses: Record<string, number>;
};

/** Row in `user_notifications` (in-app notification inbox). */
export type DbUserNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type DbProfile = {
  id: string;
  user_id: string;
  net_take_home: number;
  currency: string;
  /** JSON blob: date/time/currency/notifications — see `normalizeUserPreferences` */
  user_preferences?: Record<string, unknown> | null;
  is_subscriber?: boolean;
  /** Stored product tier; effective access also depends on subscription window. */
  subscription_tier?: string | null;
  subscription_ends_at?: string | null;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
};

/** Days before due date to send a reminder. 3 = 3 days before, 1 = 1 day before, 0 = on due date. */
export type ReminderDay = 3 | 1 | 0;

export const REMINDER_OPTIONS: { value: ReminderDay; label: string }[] = [
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
  { value: 0, label: "On due date" },
];

export type DbExpenseEntry = {
  id: string;
  profile_id: string;
  category_id: ExpenseCategoryKey;
  amount: number;
  billing_period?: "monthly" | "quarterly" | "yearly";
  due_month?: number | null;
  note?: string;
  notes?: string | null;
  /** Monthly due day; stored as YYYY-MM-DD with canonical `1970-01-{DD}` (only the day is meaningful). */
  due_date?: string | null;
  reminder_days_before?: number[] | null;
  created_at: string;
  updated_at: string;
};

/** Free accounts: max rows on to-buy and to-do (see `src/lib/subscription-tier.ts`). */
export { FREE_TIER_MAX_LIST_ITEMS } from "@/lib/subscription-tier";

/** Net worth item type. */
export type NetWorthItemType = "asset" | "liability";

/** Category for net worth items (property = house, vehicle = car, etc.). */
export type NetWorthCategoryKey =
  | "property"
  | "vehicle"
  | "loan"
  | "gold_jewelry"
  | "investment"
  | "intellectual_assets"
  | "receivables_rights"
  | "other";

/** Business use = can generate income (asset); personal = liability. */
export type NetWorthUseType = "business" | "personal" | null;

/** Income (net take-home) category keys for multi-row income entry. */
export type IncomeCategoryKey = "salary" | "business" | "gift" | "investment" | "other";

export const INCOME_CATEGORIES: { value: IncomeCategoryKey; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "business", label: "Business" },
  { value: "gift", label: "Gift" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

/** Expense category keys that can be suggested as asset/liability. */
export const NET_WORTH_DECLARABLE_EXPENSE_CATEGORIES = [
  { expenseCategoryId: "rent" as const, netWorthCategoryKey: "property" as const, label: "Property / House", alwaysAsset: true },
  { expenseCategoryId: "transport" as const, netWorthCategoryKey: "vehicle" as const, label: "Vehicle / Car", alwaysAsset: false },
] as const;
