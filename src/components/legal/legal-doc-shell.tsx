import type { ReactNode } from "react";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { Header } from "@/components/landing/header";
import { BackLink } from "@/components/app/back-link";
import { OttoBeside } from "@/components/mascot/otto-beside";
import { MASCOT_NAME } from "@/lib/constants/mascot";

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
          <BackLink href={LEGAL_ROUTES.hub} label="Legal" />
          <div className="mt-2 flex items-end justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <OttoBeside pose="check" size={110} label={`${MASCOT_NAME} reading the fine print with his magnifying glass`} />
          </div>
          <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
