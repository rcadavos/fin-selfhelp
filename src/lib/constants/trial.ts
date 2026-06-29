/**
 * Free-trial constants — every new account automatically gets full Pro access
 * for a limited window after signup (set by the `handle_new_user()` Supabase
 * trigger). Keep this in sync with the trial interval in the latest
 * `public.handle_new_user()` migration.
 */

/** Length of the automatic Pro free trial granted to every new account, in days. */
export const TRIAL_DURATION_DAYS = 14;

/** Short marketing label, e.g. for badges and chips. */
export const TRIAL_LABEL = `${TRIAL_DURATION_DAYS}-day Pro free trial`;

/** Longer one-line description for emails, pricing copy, and FAQs. */
export const TRIAL_DESCRIPTION = `Every new account starts with a ${TRIAL_DURATION_DAYS}-day Pro free trial — no card required.`;
