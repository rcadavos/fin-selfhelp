import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { Header } from "@/components/landing/header";
import { ChevronLeft } from "lucide-react";

export const metadata = buildPageMetadata({
  title: "Legal",
  description: "Terms, privacy, cookies, and data practices for OmniTrak.",
  path: LEGAL_ROUTES.hub,
});

const documents = [
  {
    href: LEGAL_ROUTES.terms,
    title: "Terms of Service",
    description: "Rules for using the Service, subscriptions, and liability.",
  },
  {
    href: LEGAL_ROUTES.privacy,
    title: "Privacy Policy",
    description: "What we collect, how we use it, and your choices.",
  },
  {
    href: LEGAL_ROUTES.cookies,
    title: "Cookie Notice",
    description: "Cookies, local storage, and similar technologies.",
  },
  {
    href: LEGAL_ROUTES.noSale,
    title: "We do not sell your data",
    description: "How we treat personal information and service providers.",
  },
] as const;

export default function LegalHubPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Legal</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Policies and notices for OmniTrak. Choose a document below.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {documents.map((doc) => (
              <li key={doc.href}>
                <Link href={doc.href} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Card className="h-full border-border/80 transition-colors hover:bg-muted/40">
                    <CardHeader className="space-y-1.5">
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{doc.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
