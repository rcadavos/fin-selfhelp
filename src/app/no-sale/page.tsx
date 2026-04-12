import { LegalDocShell } from "@/components/legal/legal-doc-shell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "We do not sell your data",
  description: "OmniTrak does not sell your personal information.",
  path: "/no-sale",
});

export default function NoSalePage() {
  return (
    <LegalDocShell title="We do not sell your personal information">
      <p>
        <strong>Last updated:</strong> April 12, 2026.
      </p>
      <p>
        OmniTrak does <strong className="text-foreground">not</strong> sell your personal
        information. We do not sell, rent, or trade your personal data to third parties for money
        or other valuable consideration in the sense of &quot;sale&quot; used in laws such as the
        California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA).
      </p>
      <p>
        We use service providers (for example cloud hosting, database, authentication, and payment
        processors) strictly to operate the Service. Their use of data is governed by contracts
        that limit processing to providing those services—not for independent marketing or resale of
        your personal information by those vendors on their own behalf.
      </p>
      <p>
        If our practices change in a way that could constitute a &quot;sale&quot; or
        &quot;sharing&quot; under applicable law, we will update this page and provide any notices
        required by law.
      </p>
      <p>
        For privacy-related questions, use the contact options in the site footer when available.
      </p>
    </LegalDocShell>
  );
}
