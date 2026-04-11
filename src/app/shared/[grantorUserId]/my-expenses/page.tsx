import { SharedPartnerCashflowPage } from "@/components/pages/shared-partner-cashflow-page";

export default function SharedMyExpensesPage({
  params,
}: {
  params: Promise<{ grantorUserId: string }>;
}) {
  return <SharedPartnerCashflowPage params={params} />;
}
