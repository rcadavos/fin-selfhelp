const STORAGE_KEY = "omni-trak-goals-categorized";

/** Read Goals “Categorized” toggle from localStorage. `null` = unset / unreadable. */
export function readGoalsCategorizedPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeGoalsCategorizedPreference(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Quota or private mode — ignore.
  }
}
