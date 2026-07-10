import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Set new password",
  description: "Choose a new password for your OmniTrak account.",
  path: "/reset-password",
  noIndex: true,
});

/** Viewport-height shell on md+ so the auth UI fits without page scroll (matches /login). */
export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background md:h-[100dvh] md:max-h-[100dvh] md:overflow-hidden">
      {children}
    </div>
  );
}
