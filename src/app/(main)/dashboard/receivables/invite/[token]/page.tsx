"use client";

import { useState, useTransition, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { HandCoins, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  getReceivableLinkByToken,
  confirmReceivableLinkByToken,
  rejectReceivableLinkByToken,
  type ReceivableLinkPreview,
} from "@/actions/receivables";

type PageState =
  | { stage: "loading" }
  | { stage: "error"; message: string }
  | { stage: "preview"; preview: ReceivableLinkPreview }
  | { stage: "done"; action: "confirmed" | "rejected" };

export default function ReceivableInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PageState>({ stage: "loading" });

  useEffect(() => {
    if (!params.token) {
      setState({ stage: "error", message: "Invalid invite link." });
      return;
    }
    getReceivableLinkByToken(params.token).then((res) => {
      if (res.error || !res.preview) {
        setState({ stage: "error", message: res.error ?? "Invite not found." });
      } else {
        setState({ stage: "preview", preview: res.preview });
      }
    });
  }, [params.token]);

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmReceivableLinkByToken(params.token);
      if (res.error) {
        setState({
          stage: "error",
          message: res.error === "email_mismatch"
            ? "This invite was sent to a different email address. Please log in with the invited account."
            : res.error,
        });
      } else {
        setState({ stage: "done", action: "confirmed" });
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectReceivableLinkByToken(params.token);
      if (res.error) {
        setState({
          stage: "error",
          message: res.error === "email_mismatch"
            ? "This invite was sent to a different email address. Please log in with the invited account."
            : res.error,
        });
      } else {
        setState({ stage: "done", action: "rejected" });
      }
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-6">

      {/* Loading */}
      {state.stage === "loading" && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <HandCoins className="h-10 w-10 opacity-30 animate-pulse" />
          <p className="text-sm">Loading invite…</p>
        </div>
      )}

      {/* Error */}
      {state.stage === "error" && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <h1 className="text-lg font-semibold">Invite unavailable</h1>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/receivables")}>
            Back to Receivables
          </Button>
        </div>
      )}

      {/* Already actioned */}
      {state.stage === "preview" && state.preview.status !== "pending" && (
        <AlreadyActioned status={state.preview.status} onBack={() => router.push("/dashboard/receivables")} />
      )}

      {/* Active invite */}
      {state.stage === "preview" && state.preview.status === "pending" && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <HandCoins className="h-12 w-12 text-primary/60" />
            <h1 className="text-xl font-semibold">Debt confirmation request</h1>
            <p className="text-sm text-muted-foreground">
              <strong>{state.preview.owner_name}</strong> says you owe them money and is asking you to confirm.
            </p>
          </div>

          {/* Details card */}
          <div className="rounded-xl border bg-card px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name on record</p>
              <p className="text-base font-semibold mt-0.5">{state.preview.debtor_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What for</p>
              <p className="text-base mt-0.5">{state.preview.description}</p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount claimed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-0.5">
                {formatCurrency(state.preview.amount)}
              </p>
            </div>
            {state.preview.notes && (
              <div className="surface border border-amber-200 bg-amber-50/60 dark:border-amber-700/30 dark:bg-amber-950/20 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Note from {state.preview.owner_name}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">{state.preview.notes}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground px-2">
            Confirming acknowledges that you owe this amount. Declining disputes the link — the owner will be notified.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
              onClick={handleReject}
              disabled={isPending}
            >
              <XCircle className="h-4 w-4" />
              Decline
            </Button>
            <Button className="flex-1 gap-1.5" onClick={handleConfirm} disabled={isPending}>
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? "Confirming…" : "Confirm I owe this"}
            </Button>
          </div>
        </div>
      )}

      {/* Done */}
      {state.stage === "done" && (
        <div className="flex flex-col items-center gap-4 rounded-xl border py-12 px-6 text-center">
          {state.action === "confirmed" ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h1 className="text-xl font-semibold">Confirmed!</h1>
              <p className="text-sm text-muted-foreground">
                You've confirmed you owe this amount. The lender has been notified.
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-muted-foreground/60" />
              <h1 className="text-xl font-semibold">Declined</h1>
              <p className="text-sm text-muted-foreground">
                You've declined this debt claim. The lender has been notified.
              </p>
            </>
          )}
          <Button variant="outline" onClick={() => router.push("/dashboard/receivables")}>
            Go to Receivables
          </Button>
        </div>
      )}
    </div>
  );
}

function AlreadyActioned({ status, onBack }: { status: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border py-12 px-6 text-center">
      {status === "confirmed" ? (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-semibold">Already confirmed</h1>
          <p className="text-sm text-muted-foreground">You've already confirmed this debt.</p>
        </>
      ) : status === "rejected" ? (
        <>
          <XCircle className="h-12 w-12 text-muted-foreground/60" />
          <h1 className="text-xl font-semibold">Already declined</h1>
          <p className="text-sm text-muted-foreground">You've already declined this request.</p>
        </>
      ) : (
        <>
          <Clock className="h-12 w-12 text-muted-foreground/60" />
          <h1 className="text-xl font-semibold">Invite no longer active</h1>
          <p className="text-sm text-muted-foreground">This invite has been cancelled or is no longer valid.</p>
        </>
      )}
      <Button variant="outline" onClick={onBack}>Back to Receivables</Button>
    </div>
  );
}
