import Link from "next/link";
import { LegalDocShell } from "@/components/legal/legal-doc-shell";
import { buildPageMetadata } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata = buildPageMetadata({
  title: "Cookie notice",
  description: "How OmniTrak uses cookies and similar technologies.",
  path: LEGAL_ROUTES.cookies,
});

export default function CookiesPage() {
  return (
    <LegalDocShell title="Cookie notice">
      <p>
        <strong>Last updated:</strong> April 12, 2026.
      </p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device. We and our service providers may use
          cookies and similar technologies (such as local storage) to keep you signed in, remember
          preferences (for example theme), protect against abuse, and understand how the Service is
          used in aggregate.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">How we use them</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Essential / functional:</strong> required for
            authentication, security, and core features (for example session cookies with our auth
            provider).
          </li>
          <li>
            <strong className="text-foreground">Preferences:</strong> such as display settings you
            choose in the app.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Your choices</h2>
        <p>
          When you first visit the site, we ask you to choose <strong>essential only</strong> or{" "}
          <strong>accept all</strong>. That choice is stored in your browser (local storage) so we
          do not show the prompt again on future visits unless you clear site data.
        </p>
        <p>
          You can control cookies through your browser settings. Blocking essential cookies may
          prevent parts of the Service (such as staying logged in) from working correctly.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">More information</h2>
        <p>
          For broader information about how we handle personal data, see our{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalDocShell>
  );
}
