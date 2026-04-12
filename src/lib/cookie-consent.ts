/** localStorage key for the user’s cookie preference (first visit = unset). */
export const COOKIE_CONSENT_STORAGE_KEY = "omnitrak-cookie-consent-v1";

export type CookieConsentChoice = "all" | "essential";

export function getStoredCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw === "all" || raw === "essential") return raw;
    return null;
  } catch {
    return null;
  }
}

export function setStoredCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
  } catch {
    // quota / private mode
  }
}

/** For future analytics or non-essential scripts: only run when user accepted all. */
export function hasAcceptedAllCookies(): boolean {
  return getStoredCookieConsent() === "all";
}
