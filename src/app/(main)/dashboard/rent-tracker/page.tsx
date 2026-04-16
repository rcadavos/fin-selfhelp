import Link from "next/link";
import { redirect } from "next/navigation";
import { getSubscriptionCapabilities } from "@/actions/subscription-capabilities";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default async function RentTrackerPage() {
  const caps = await getSubscriptionCapabilities();
  if (!caps?.hasPremiumAccess) {
    redirect("/account/subscription/payment?plan=premium");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          Rent Tracker
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Premium module — schedule rent, deposits, and renewals in one place. Full workflow UI is coming next.
        </p>
      </header>
      <div className="mt-8 rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Placeholder: list upcoming rent dates, amounts, and reminders here.
      </div>
      <Button variant="outline" className="mt-8" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
