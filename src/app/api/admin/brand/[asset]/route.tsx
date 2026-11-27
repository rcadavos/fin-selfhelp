import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { FACEBOOK_COVER_VARIANTS, FACEBOOK_PROFILE_VARIANTS } from "@/lib/constants/social";
import { pickVariant, renderFacebookCover, renderFacebookProfile } from "@/lib/og/facebook-assets";

/**
 * The Facebook cover and profile picture. Admin only (a tool, not a public asset):
 * /admin/settings previews them and downloads them for upload to the Page.
 *
 *   GET /api/admin/brand/facebook-cover?variant=brand|bills|otto|season
 *   GET /api/admin/brand/facebook-profile?variant=green|paper
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const auth = await requireAdminUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { asset } = await params;
  const variant = new URL(request.url).searchParams.get("variant");
  const headers = { "Cache-Control": "private, max-age=300" };

  if (asset === "facebook-cover") {
    return renderFacebookCover(pickVariant(variant, FACEBOOK_COVER_VARIANTS), { headers });
  }
  if (asset === "facebook-profile") {
    return renderFacebookProfile(pickVariant(variant, FACEBOOK_PROFILE_VARIANTS), { headers });
  }
  return NextResponse.json({ error: "Unknown asset" }, { status: 404 });
}
