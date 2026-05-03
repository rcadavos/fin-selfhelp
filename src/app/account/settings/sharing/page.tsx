"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
import { ContentHeader } from "@/components/app/content-header";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import {
  listOutgoingShares,
  listIncomingShares,
  createAccountShare,
  revokeAccountShare,
  deletePendingInvite,
  updateAccountSharePermissions,
  type AccountShareRow,
} from "@/actions/account-sharing";
import { getBaseUrl } from "@/lib/seo";
import { PartnerAccessInfo } from "@/components/account/partner-access-info";
import { subscriptionStatusQueryOptions } from "@/lib/query/subscription-user";
import { UsersRound, Link2, Trash2, Ban, ExternalLink, Loader2 } from "lucide-react";


function permBadges(s: AccountShareRow) {
  const parts: string[] = [];
  if (s.can_view_expenses) parts.push("Bills");
  if (s.can_view_to_buy) parts.push("To-buy");
  return parts.length ? parts.join(" • ") : "—";
}

function SharingSettingsContent() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { data: subscriptionStatus } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const canShare = subscriptionStatus?.hasProAccess ?? false;
  const { showError, showSuccess } = useSnackbar();
  const [outgoing, setOutgoing] = useState<AccountShareRow[]>([]);
  const [incoming, setIncoming] = useState<AccountShareRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [pe, setPe] = useState(true);
  const [ptb, setPtb] = useState(false);
  const refresh = useCallback(async () => {
    const [o, i] = await Promise.all([listOutgoingShares(), listIncomingShares()]);
    if (o.shares) setOutgoing(o.shares);
    if (i.shares) setIncoming(i.shares);
    if (o.error) showError(o.error);
    if (i.error) showError(i.error);
  }, [showError]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || loading) return;
    void refresh();
  }, [user, loading, refresh]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const res = await createAccountShare({
      inviteEmail: email.trim(),
      canViewExpenses: pe,
      canViewToBuy: ptb,
    });
    setBusy(false);
    if (res.error) {
      showError(res.error);
      return;
    }
    showSuccess("Invite created. Copy the link below and send it to your partner.");
    setEmail("");
    await refresh();
  }

  async function onRevoke(id: string) {
    setBusy(true);
    const res = await revokeAccountShare(id);
    setBusy(false);
    if (res.error) showError(res.error);
    else {
      showSuccess("Access updated.");
      await refresh();
    }
  }

  async function onDeletePending(id: string) {
    setBusy(true);
    const res = await deletePendingInvite(id);
    setBusy(false);
    if (res.error) showError(res.error);
    else await refresh();
  }

  async function onUpdatePerms(s: AccountShareRow, patch: Partial<{ canViewExpenses: boolean; canViewToBuy: boolean }>) {
    setBusy(true);
    const res = await updateAccountSharePermissions(s.id, {
      canViewExpenses: patch.canViewExpenses ?? s.can_view_expenses,
      canViewToBuy: patch.canViewToBuy ?? s.can_view_to_buy,
    });
    setBusy(false);
    if (res.error) showError(res.error);
    else await refresh();
  }

  const base = getBaseUrl();

  return (
    <div className="w-full py-2">
      <ContentHeader
        title="Account Sharing"
        subtitle="Invite a spouse or partner to view selected parts of your account. They sign in with their own OmniTrak account and use the invite link you send."
        icon={UsersRound}
        className="mb-6"
      />

      <Card className="mb-6 border-muted/80 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What your partner can do</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnerAccessInfo />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Invite someone</CardTitle>
          <CardDescription>
            Enter their email (must match the account they will use to accept). Choose which areas to share — see
            above for what they can change. Invites require an active Pro or Premium plan on your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canShare ? (
            <p className="text-sm text-muted-foreground">
              Partner sharing is included with Pro and Premium.{" "}
              <Link href="/account/subscription/payment" className="font-medium text-primary underline-offset-4 hover:underline">
                View plans and upgrade
              </Link>{" "}
              to send invites. You can still revoke or delete existing invites below.
            </p>
          ) : (
            <form onSubmit={onInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Partner email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">They can view</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pe} onChange={(e) => setPe(e.target.checked)} className="rounded border-input" />
                  Bills (mark paid for the month — no editing, adding, or deleting)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={ptb} onChange={(e) => setPtb(e.target.checked)} className="rounded border-input" />
                  To-buy list
                </label>
              </fieldset>
              <Button type="submit" disabled={busy || !email.includes("@")}>
                Create invite
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Your invites</CardTitle>
          <CardDescription>Pending invites include a secret link. Anyone with the link could try to accept — only the invited email can succeed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            outgoing.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.invite_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.status === "pending" && "Waiting for partner to accept"}
                      {s.status === "accepted" && "Active"}
                      {s.status === "revoked" && "Revoked"}
                    </p>
                  </div>
                  <Badge variant={s.status === "accepted" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Access: {permBadges(s)}</p>
                {s.status === "pending" && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="block max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
                      {`${base}/account/settings/sharing/accept?share=${s.id}&token=${s.invite_token}`}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${base}/account/settings/sharing/accept?share=${s.id}&token=${s.invite_token}`
                        );
                        showSuccess("Link copied");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  </div>
                )}
                {s.status === "accepted" && (
                  <div className="flex flex-wrap gap-2 border-t pt-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={s.can_view_expenses}
                        disabled={busy || !canShare}
                        onChange={(e) => onUpdatePerms(s, { canViewExpenses: e.target.checked })}
                      />
                      Bills
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={s.can_view_to_buy}
                        disabled={busy || !canShare}
                        onChange={(e) => onUpdatePerms(s, { canViewToBuy: e.target.checked })}
                      />
                      To-buy
                    </label>
                    {!canShare ? (
                      <p className="w-full text-muted-foreground">
                        Renew Pro or Premium to change shared areas. You can still revoke access above.
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {s.status === "pending" && (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onDeletePending(s.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete invite
                    </Button>
                  )}
                  {(s.status === "pending" || s.status === "accepted") && (
                    <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => onRevoke(s.id)}>
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      {s.status === "pending" ? "Cancel" : "Revoke access"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Invites for you</CardTitle>
          <CardDescription>Accept an invite using the link your partner sent (while signed in as this account).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {incoming.filter((s) => s.status === "pending").length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites for {user.email}.</p>
          ) : (
            incoming
              .filter((s) => s.status === "pending")
              .map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">Someone invited you</p>
                  <p className="text-muted-foreground">Access: {permBadges(s)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Open the invite link from your partner, or paste it in the browser where you are logged in as{" "}
                    <span className="font-medium text-foreground">{user.email}</span>.
                  </p>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/account/shared">
            <ExternalLink className="mr-2 h-4 w-4" />
            Accounts shared with me
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/account/settings">Back to settings</Link>
        </Button>
      </div>
    </div>
  );
}

export default function SharingSettingsPage() {
  return (
    <Suspense fallback={
      <main className="app-main-centered">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    }>
      <SharingSettingsContent />
    </Suspense>
  );
}
