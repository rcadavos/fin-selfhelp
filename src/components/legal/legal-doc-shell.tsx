import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { Header } from "@/components/landing/header";
import { ChevronLeft } from "lucide-react";

type LegalDocShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocShell({ title, children }: LegalDocShellProps) {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <Link
            href={LEGAL_ROUTES.hub}
            className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Legal
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
