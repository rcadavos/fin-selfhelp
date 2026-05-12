import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function UnsubscribedPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {error === "invalid" ? "Invalid unsubscribe link" : "Something went wrong"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error === "invalid"
                ? "This link is not valid or has been tampered with. Please use the link from your original email."
                : "We couldn't process your request right now. Please try again in a moment."}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">You&apos;ve been unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You won&apos;t receive broadcast or reminder emails from OmniTrak anymore.
              Transactional emails (security alerts, receipts) will still be sent.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/notifications">Manage notification settings</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Changed your mind?{" "}
          <Link href="/account/notifications" className="underline underline-offset-2 hover:text-foreground">
            Re-enable emails
          </Link>{" "}
          in your account settings.
        </p>
      </div>
    </div>
  );
}
