import { SharedPartnerCashflowPage } from "@/components/pages/shared-partner-cashflow-page";

export default function SharedExpensesPage({
  params,
}: {
  params: Promise<{ grantorUserId: string }>;
}) {
  return <SharedPartnerCashflowPage params={params} />;
}
