import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Reset password",
  description: "Reset your OmniTrak password — we'll email you a secure link to set a new one.",
  path: "/forgot-password",
});

/** Viewport-height shell on md+ so the auth UI fits without page scroll (matches /login). */
export default function ForgotPasswordLayout({
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
