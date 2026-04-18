import { AppShell } from "@/components/app/app-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  noIndex: false,
});

/** Same content width as dashboard (`max-w-4xl` + horizontal padding). */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout app-layout--shell">
      <AppShell>
        <div className="container mx-auto w-full max-w-4xl px-4 pb-8 pt-4">{children}</div>
      </AppShell>
    </div>
  );
}
