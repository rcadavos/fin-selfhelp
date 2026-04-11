"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptAccountShare } from "@/actions/account-sharing";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

type InvitePreviewParsed = {
  ok: boolean;
  inviter_name?: string | null;
  inviter_email?: string | null;
  can_view_expenses: boolean;
  can_view_to_buy: boolean;
  can_view_net_worth: boolean;
};

function parseInvitePreview(data: unknown): InvitePreviewParsed | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      const o = JSON.parse(data) as Record<string, unknown>;
      return normalizePreview(o);
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return normalizePreview(data as Record<string, unknown>);
  }
  return null;
}

function normalizePreview(o: Record<string, unknown>): InvitePreviewParsed {
  return {
    ok: o.ok === true,
    inviter_name: typeof o.inviter_name === "string" ? o.inviter_name : null,
    inviter_email: typeof o.inviter_email === "string" ? o.inviter_email : null,
    can_view_expenses: o.can_view_expenses === true,
    can_view_to_buy: o.can_view_to_buy === true,
    can_view_net_worth: o.can_view_net_worth === true,
  };
}

/** Labels aligned with Account sharing settings (`permBadges`). */
function sharedAccessLabels(p: Pick<InvitePreviewParsed, "can_view_expenses" | "can_view_to_buy" | "can_view_net_worth">): string[] {
  const parts: string[] = [];
  if (p.can_view_expenses) parts.push("My Expenses");
  if (p.can_view_to_buy) parts.push("To-buy");
  if (p.can_view_net_worth) parts.push("Net worth");
  return parts;
}

export function AcceptShareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [inviterDisplay, setInviterDisplay] = useState<string | null>(null);
  const [inviterLoaded, setInviterLoaded] = useState(false);
  const [sharedAccess, setSharedAccess] = useState<string[]>([]);

  const shareId = searchParams.get("share") ?? "";
  const token = searchParams.get("token") ?? "";

  const canAccept = useMemo(() => Boolean(shareId && token), [shareId, token]);

  useEffect(() => {
    if (!user || !canAccept) {
      setInviterDisplay(null);
      setSharedAccess([]);
      setInviterLoaded(!canAccept);
      return;
    }

    let cancelled = false;
    setInviterLoaded(false);

    const supabase = createClient();
    void supabase
      .rpc("get_invite_inviter_preview", { p_share_id: shareId, p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return;
        setInviterLoaded(true);
        if (error) return;
        const parsed = parseInvitePreview(data);
        if (!parsed?.ok) {
          setSharedAccess([]);
          return;
        }
        const name = parsed.inviter_name?.trim();
        const email = parsed.inviter_email?.trim();
        if (name) setInviterDisplay(name);
        else if (email) setInviterDisplay(email);
        else setInviterDisplay(null);
        setSharedAccess(sharedAccessLabels(parsed));
      });

    return () => {
      cancelled = true;
    };
  }, [user, canAccept, shareId, token]);

  if (loading) {
    return (
      <div className="app-main-centered min-h-[40vh]">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?next=${encodeURIComponent(`/account/settings/sharing/accept?share=${shareId}&token=${token}`)}`);
    return (
      <div className="app-main-centered min-h-[40vh]">
        <p className="text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  async function onAccept() {
    if (!canAccept) return;
    setStatus("working");
    setMessage("");
    const res = await acceptAccountShare(shareId, token);
    if (res.error) {
      setStatus("err");
      setMessage(
        res.error === "email_mismatch"
          ? "This invite was sent to a different email address. Sign in with the invited account."
          : res.error.replace(/_/g, " ")
      );
      return;
    }
    setStatus("ok");
    setMessage("You can open shared views from “Accounts shared with me”.");
  }

  return (
    <div className="w-full min-w-0 py-2">
      <div className="mb-6 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Accept invite</h1>
        <p className="text-sm text-muted-foreground">
          {!canAccept ? (
            "Use the full invite link from your partner."
          ) : !inviterLoaded ? (
            "Loading invite details…"
          ) : inviterDisplay ? (
            <>
              Invited by <span className="font-medium text-foreground">{inviterDisplay}</span>.
            </>
          ) : (
            "Link this account to a partner who shared with you."
          )}
        </p>
        {inviterLoaded && sharedAccess.length > 0 ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-foreground">Access (read-only)</p>
            <ul className="mt-1.5 list-outside list-disc space-y-1 pl-5 text-sm text-foreground">
              {sharedAccess.map((label, i) => (
                <li key={`${label}-${i}`}>{label}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Card className="min-w-0 border-0 bg-transparent shadow-none">
        <CardContent className="space-y-4 px-0">
          {!canAccept && (
            <p className="text-sm text-destructive">Missing invite link. Ask your partner for the full link.</p>
          )}
          {status === "idle" && canAccept && (
            <Button onClick={() => void onAccept()}>Accept invite</Button>
          )}
          {status === "working" && <p className="text-sm text-muted-foreground">Working…</p>}
          {status === "ok" && (
            <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}
          {status === "err" && (
            <div className="flex items-start gap-2 text-destructive">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default">
              <Link href="/account/shared">Shared with me</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/settings/sharing">Sharing settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
