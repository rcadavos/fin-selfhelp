import { SharedPartnerBillsPage } from "@/components/pages/shared-partner-bills-page";

export default function SharedExpensesPage({
  params,
}: {
  params: Promise<{ grantorUserId: string }>;
}) {
  return <SharedPartnerBillsPage params={params} />;
}
