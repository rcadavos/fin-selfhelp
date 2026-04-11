import { AppHeader } from "@/components/app/app-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Log in",
  description: "Sign in to OmniTrak — your one-stop personal tracker for bills, cashflow, lists, and more.",
  path: "/login",
});

export default function LoginLayout({
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
