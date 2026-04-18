import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Log in",
  description: "Sign in to OmniTrak — your all-in-one personal tracker for bills, cashflow, lists, and more.",
  path: "/login",
});

/** Viewport-height shell on md+ so the login UI can fit without page scroll (see page). */
export default function LoginLayout({
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
