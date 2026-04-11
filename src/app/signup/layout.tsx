import { AppHeader } from "@/components/app/app-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description: "Create your OmniTrak account — your one-stop personal tracker for bills, cashflow, lists, and more.",
  path: "/signup",
});

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <AppHeader />
      {children}
    </div>
  );
}
