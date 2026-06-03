export type ToBuyItem = {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice: string;
  category: ToBuyCategory;
  checked: boolean;
  /** Used by To-Do list mode; YYYY-MM-DD from `<input type="date">`. */
  targetDate?: string | null;
  createdAt: string;
};

export type ToBuyCategory =
  | "meeting"
  | "pantry"
  | "errand"
  | "personal"
  | "work"
  | "health"
  | "other"
  // Legacy To-Buy categories (kept for backward compatibility)
  | "grocery"
  | "household"
  | "electronics"
  | "clothing";

export const TO_BUY_CATEGORIES: { value: ToBuyCategory; label: string }[] = [
  { value: "grocery", label: "Grocery" },
  { value: "household", label: "Household" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "health", label: "Health & Personal Care" },
  { value: "other", label: "Other" },
];

export const REMINDER_CATEGORIES: { value: ToBuyCategory; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "pantry", label: "Pantry Items" },
  { value: "errand", label: "Errand" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

export const TO_BUY_STORAGE_KEY = "to-buy-items";
export const TO_DO_STORAGE_KEY = "to-do-items";

const STORAGE_KEY = TO_BUY_STORAGE_KEY;

export function getToBuyItems(): ToBuyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ToBuyItem[];
  } catch {
    return [];
  }
}

export function saveToBuyItems(items: ToBuyItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota or other errors
  }
}

export function clearToBuyLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getToDoItems(): ToBuyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TO_DO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ToBuyItem[];
  } catch {
    return [];
  }
}

export function saveToDoItems(items: ToBuyItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TO_DO_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota or other errors
  }
}

export function clearToDoLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TO_DO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function generateToBuyItemId(): string {
  return crypto.randomUUID();
}

export function getCategoryLabel(key: ToBuyCategory): string {
  return (
    REMINDER_CATEGORIES.find((c) => c.value === key)?.label ??
    TO_BUY_CATEGORIES.find((c) => c.value === key)?.label ??
    "Other"
  );
}
