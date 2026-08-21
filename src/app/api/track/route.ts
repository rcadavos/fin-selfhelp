import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Longest path we will store. page_views.path is untyped `text`, so the cap has to live here. */
const MAX_PATH_LENGTH = 128;

/**
 * Normalise a caller-supplied `?path=` into something safe to store, or null to drop it.
 *
 * This endpoint is public and writes with the service-role client (RLS does not
 * apply), so the query string is the only thing standing between a visitor and
 * arbitrary rows in `page_views`. Accept same-origin relative paths only, drop
 * the query/fragment, and hard-cap the length.
 */
function normalizeTrackedPath(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const [pathname] = trimmed.split(/[?#]/);
  if (!pathname || pathname.length > MAX_PATH_LENGTH) return null;
  // Allowlist of URL-path characters; anything else (whitespace, control bytes,
  // quotes, angle brackets, "://") is rejected outright rather than escaped.
  if (!/^[/][-A-Za-z0-9._~%/]*$/.test(pathname)) return null;
  return pathname;
}

export async function POST(req: NextRequest) {
  try {
    const path = normalizeTrackedPath(new URL(req.url).searchParams.get("path"));
    // Unparseable or oversized paths are dropped, not stored — a bad value is
    // never worth a row, and returning 204 keeps the client from retrying.
    if (path) {
      const supabase = createServiceRoleClient();
      await supabase.from("page_views").insert({ path });
    }
  } catch {
    // silently fail — never block the visitor
  }
  return new NextResponse(null, { status: 204 });
}
