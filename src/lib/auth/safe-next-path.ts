/** Allow only same-origin relative paths after OAuth (open redirect hardening). */
export function safeNextPath(raw: string | null): string {
  const next = (raw ?? "").trim() || "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (next.includes("://") || next.includes("\n") || next.includes("\r")) return "/dashboard";
  const [pathname] = next.split("?");
  // Avoid redirect loops back into auth screens after successful login.
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/")
  ) {
    return "/dashboard";
  }
  return next;
}
