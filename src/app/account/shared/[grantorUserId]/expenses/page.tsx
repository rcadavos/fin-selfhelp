import { SharedPartnerCashflowPage } from "@/components/pages/shared-partner-cashflow-page";

/** @deprecated Use `/account/shared/[grantorUserId]/my-expenses` — kept for bookmarked links. */
export default function SharedExpensesPage({
  params,
}: {
  params: Promise<{ grantorUserId: string }>;
}) {
  return <SharedPartnerCashflowPage params={params} />;
}
