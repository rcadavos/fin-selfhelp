/** Shown instead of a stored `failure_reason` when the accounts feature is off for the user. */
export const AUTO_DEBIT_FAILURE_GENERIC_REASON = "Auto-debit did not go through.";

/**
 * Reminder days used for a bill whose auto-debit is inert because the user's app
 * mode switches auto-debit off, but whose `reminder_days_before` is NULL (the
 * planned-expense form clears reminder days whenever auto-debit is on).
 *
 * Due-date-day only, so an inert auto-debit bill never silently claims a wider
 * reminder window than the user chose. Applied at read time — the stored column
 * is never rewritten, so switching back to Full cashflow restores auto-debit exactly.
 */
export const INERT_AUTO_DEBIT_REMINDER_DAYS: readonly number[] = [0];
