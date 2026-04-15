import { LegalDocShell } from "@/components/legal/legal-doc-shell";
import { buildPageMetadata } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata = buildPageMetadata({
  title: "Privacy policy",
  description: "How OmniTrak collects, uses, and protects your information.",
  path: LEGAL_ROUTES.privacy,
});

export default function PrivacyPage() {
  return (
    <LegalDocShell title="Privacy policy">
      <p>
        <strong>Last updated:</strong> April 12, 2026. This policy describes how OmniTrak
        (&quot;we&quot;, &quot;us&quot;) handles information when you use our website and
        application.
      </p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Information we collect</h2>
        <p>We may collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Account data:</strong> such as email address and
            authentication identifiers when you sign up or sign in (including via third-party
            providers like Google, if enabled).
          </li>
          <li>
            <strong className="text-foreground">Content you provide:</strong> such as expense
            entries, budgets, lists, and preferences you save in the Service.
          </li>
          <li>
            <strong className="text-foreground">Technical data:</strong> such as device type,
            browser, approximate region from IP, and diagnostic logs needed to operate and secure
            the Service.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. How we use information</h2>
        <p>We use information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>provide, maintain, and improve the Service;</li>
          <li>authenticate you and prevent fraud or abuse;</li>
          <li>process payments and subscriptions where applicable;</li>
          <li>communicate with you about the Service (e.g. security or product notices).</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Service providers</h2>
        <p>
          We use trusted infrastructure providers (for example hosting, database, and authentication
          services) to run the Service. They process data on our behalf under appropriate
          agreements and only as needed to provide their services.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Data retention</h2>
        <p>
          We retain information for as long as your account is active and as needed to provide the
          Service, comply with law, resolve disputes, and enforce our agreements. You may request
          deletion of your account where the product supports it; some records may be retained
          where required by law.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Security</h2>
        <p>
          We use industry-standard measures to protect data in transit and at rest. No method of
          transmission or storage is 100% secure; we encourage strong passwords and protecting your
          devices.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Your choices</h2>
        <p>
          Depending on your region, you may have rights to access, correct, export, or delete
          certain personal information. Contact us using the options in the footer to make a
          request. We may need to verify your identity before responding.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. International users</h2>
        <p>
          If you access the Service from outside the country where our systems operate, your
          information may be transferred and processed in other countries where privacy laws may
          differ.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Children</h2>
        <p>
          The Service is not directed to children under 13 (or the minimum age in your
          jurisdiction). We do not knowingly collect personal information from children.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. We will revise the &quot;Last updated&quot;
          date above. Material changes may be communicated through the Service or by email where
          appropriate.
        </p>
      </section>
    </LegalDocShell>
  );
}
