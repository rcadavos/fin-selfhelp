import { LegalDocShell } from "@/components/legal/legal-doc-shell";
import { buildPageMetadata } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "OmniTrak terms of service and user agreement.",
  path: LEGAL_ROUTES.terms,
});

export default function TermsPage() {
  return (
    <LegalDocShell title="Terms of Service">
      <p>
        <strong>Last updated:</strong> April 12, 2026. These terms govern your use of OmniTrak
        (&quot;the Service&quot;). By creating an account or using the Service, you agree to them.
      </p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. The Service</h2>
        <p>
          OmniTrak provides tools to help you track bills, expenses, budgets, and related personal
          finance information. Features may change over time. We aim for reliable operation but do
          not guarantee uninterrupted or error-free service.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Your account</h2>
        <p>
          You are responsible for safeguarding your login credentials and for activity under your
          account. You must provide accurate information and keep it up to date where relevant.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Acceptable use</h2>
        <p>You agree not to misuse the Service, including by attempting to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>access data or systems you are not authorized to use;</li>
          <li>interfere with or disrupt the Service or other users;</li>
          <li>use the Service for unlawful purposes or to violate others&apos; rights.</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Subscriptions and payments</h2>
        <p>
          Paid features, if offered, are subject to the pricing and billing terms shown at checkout
          or in the app. Unless stated otherwise, fees are non-refundable except where required by
          law.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Disclaimer</h2>
        <p>
          The Service is provided &quot;as is.&quot; OmniTrak is not financial, tax, or legal
          advice. You remain responsible for your financial decisions and compliance with applicable
          laws.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, OmniTrak and its operators will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or loss of profits or
          data, arising from your use of the Service.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Changes</h2>
        <p>
          We may update these terms. We will post the new version on this page and update the
          &quot;Last updated&quot; date. Continued use after changes constitutes acceptance where
          permitted by law.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
        <p>
          Questions about these terms: use the contact options listed in the site footer, if
          provided.
        </p>
      </section>
    </LegalDocShell>
  );
}
