import { redirect } from "next/navigation";

export default function SubscriptionPaymentPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan === "premium" ? "premium" : searchParams.plan === "pro" ? "pro" : null;
  const dest = plan ? `/account/subscription?plan=${plan}` : "/account/subscription";
  redirect(dest);
}
