"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { listAcceptedSharesWithGrantors, type AccountShareRow } from "@/actions/account-sharing";
import { PartnerAccessInfo } from "@/components/account/partner-access-info";
import { ShoppingCart, Banknote } from "lucide-react";

type Row = NonNullable<Awaited<ReturnType<typeof listAcceptedSharesWithGrantors>>["rows"]>[number];

function shareAccessLabel(share: AccountShareRow) {
  const parts: string[] = [];
  if (share.can_view_expenses) parts.push("My Expenses");
  if (share.can_view_to_buy) parts.push("To-buy");
  return parts.length ? parts.join(" · ") : "—";
}

export default function SharedWithMePage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listAcceptedSharesWithGrantors();
    if (res.error) setErr(res.error);
    else setRows(res.rows ?? []);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) void load();
  }, [user, loading, load]);

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <div className="w-full py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Accounts shared with you</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Open a partner&apos;s hub below for My Expenses and/or To-buy, depending on what they shared with you.
      </p>
      <div className="mt-4 rounded-lg border border-muted/80 bg-muted/20 p-4">
        <PartnerAccessInfo />
      </div>

      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No active shares yet. Ask your partner to send an invite link, then accept it from the same email
              account.
            </CardContent>
          </Card>
        ) : (
          rows.map(({ share, grantorUserId, grantorDisplayName, grantorEmail }) => {
            const heading = grantorDisplayName ?? grantorEmail ?? "Partner";
            const showEmailSubtitle = Boolean(grantorDisplayName && grantorEmail);
            return (
              <Card key={share.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{heading}</CardTitle>
                  {showEmailSubtitle ? (
                    <CardDescription className="text-xs">{grantorEmail}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Access: <span className="font-medium text-foreground">{shareAccessLabel(share)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {share.can_view_expenses && (
                      <Button size="sm" variant="outline" asChild className="gap-1">
                        <Link href={`/account/shared/${grantorUserId}/my-expenses`}>
                          <Banknote className="h-4 w-4" />
                          My Expenses
                        </Link>
                      </Button>
                    )}
                    {share.can_view_to_buy && (
                      <Button size="sm" variant="outline" asChild className="gap-1">
                        <Link href={`/account/shared/${grantorUserId}/to-buy`}>
                          <ShoppingCart className="h-4 w-4" />
                          To-buy
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/account/settings/sharing">Manage sharing</Link>
        </Button>
      </div>
    </div>
  );
}
