import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { Header } from "@/components/landing/header";

type LegalDocShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocShell({ title, children }: LegalDocShellProps) {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <Link
            href={LEGAL_ROUTES.hub}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to legal
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
