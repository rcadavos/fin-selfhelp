/**
 * Admin accounts whose admin role can never be removed from the admin Users
 * page. Keeps the owner from being locked out of the admin area by a misclick
 * or by another admin.
 */
export const PROTECTED_ADMIN_EMAILS: readonly string[] = ["rgcadavos@gmail.com"];

/** Whether this email belongs to an admin that cannot be demoted. */
export function isProtectedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PROTECTED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
