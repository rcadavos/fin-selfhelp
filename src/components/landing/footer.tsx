import Link from "next/link";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { cn } from "@/lib/utils";
import { FooterFeedback } from "./footer-feedback";
import { ExternalLink } from "lucide-react";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
const PORTFOLIO_URL = "https://rgcadavos.dev";

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#highlights", label: "Highlights" },
  { href: "#built-for", label: "Who it's for" },
  { href: "#subscribe", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#reviews", label: "Reviews" },
  { href: "/changelog", label: "Changelog" },
] as const;

const legalLinks = [
  { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
  { href: LEGAL_ROUTES.privacy, label: "Privacy Policy" },
  { href: LEGAL_ROUTES.cookies, label: "Cookie Notice" },
  { href: LEGAL_ROUTES.noSale, label: "We don't sell your data" },
] as const;

const columnHeader = "mb-3 font-mono text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground";
const columnLink = "transition-colors hover:text-primary";

export function Footer({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-border bg-background", className)}>
      <FooterFeedback />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="space-y-4 md:col-span-5">
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">OmniTrak</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Your all-in-one personal tracker for planned expenses, cashflow, lists, and more.
              </p>
            </div>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Developer portfolio
              <ExternalLink
                className="size-3.5 opacity-70 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7 lg:gap-12">
            <div>
              <p className={columnHeader}>Product</p>
              <ul className="space-y-2.5 text-sm text-foreground">
                {productLinks.map(({ href, label }) => (
                  <li key={href}>
                    {href.startsWith("#") ? (
                      <a href={href} className={columnLink}>
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className={columnLink}>
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className={columnHeader}>Legal</p>
              <ul className="space-y-2.5 text-sm text-foreground">
                {legalLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={columnLink}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className={columnHeader}>Connect</p>
              <ul className="space-y-2.5 text-sm text-foreground">
                {SUPPORT_EMAIL ? (
                  <li>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className={columnLink}>
                      {SUPPORT_EMAIL}
                    </a>
                  </li>
                ) : null}
                <li>
                  <a
                    href={PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("inline-flex items-center gap-1", columnLink)}
                  >
                    rgcadavos.dev
                    <ExternalLink className="size-3 opacity-70" aria-hidden />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {year} OmniTrak. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
