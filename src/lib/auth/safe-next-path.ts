/** Allow only same-origin relative paths after OAuth (open redirect hardening). */
export function safeNextPath(raw: string | null): string {
  const next = (raw ?? "").trim() || "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (next.includes("://") || next.includes("\n") || next.includes("\r")) return "/dashboard";
  return next;
}
