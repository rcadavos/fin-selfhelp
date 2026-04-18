import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description: "Create your OmniTrak account — your all-in-one personal tracker for bills, cashflow, lists, and more.",
  path: "/signup",
});

/** Same viewport shell as login so auth pages align on desktop. */
export default function SignupLayout({
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
