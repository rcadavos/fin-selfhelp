import { LegalDocShell } from "@/components/legal/legal-doc-shell";
import { buildPageMetadata } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata = buildPageMetadata({
  title: "We do not sell your data",
  description: "OmniTrak does not sell your personal information under the Philippine Data Privacy Act of 2012.",
  path: LEGAL_ROUTES.noSale,
});

export default function NoSalePage() {
  return (
    <LegalDocShell title="We do not sell your personal information">
      <p>
        <strong>Last updated:</strong> April 29, 2026.
      </p>
      <p>
        OmniTrak does <strong className="text-foreground">not</strong> sell your personal
        information. We do not sell, rent, trade, or otherwise disclose your personal data to third
        parties for commercial gain or any valuable consideration.
      </p>
      <p>
        This commitment is consistent with the{" "}
        <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its
        Implementing Rules and Regulations, as enforced by the{" "}
        <strong>National Privacy Commission (NPC)</strong>. Under RA 10173, personal information
        may only be processed when there is a lawful basis — such as your consent, a contractual
        necessity, or a legitimate interest — and never for unauthorized commercial purposes.
      </p>
      <p>
        We engage service providers (for example, cloud hosting, database, authentication, and
        payment processors) solely to operate the Service. These providers are bound by contractual
        obligations that restrict their use of your data to the specific services they render on our
        behalf. They are not permitted to process, share, or resell your personal information for
        their own commercial purposes.
      </p>
      <p>
        As a data subject under RA 10173, you have the right to be informed, to access your
        personal data, to object to processing, to erasure or blocking, to rectification, and to
        data portability, among others. If you wish to exercise any of these rights, please use the
        contact options in the site footer.
      </p>
      <p>
        If our practices change in a way that affects how your personal data is processed or
        disclosed, we will update this page and provide any notices required under applicable
        Philippine law.
      </p>
    </LegalDocShell>
  );
}
