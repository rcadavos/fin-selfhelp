"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
import { listAcceptedSharesWithGrantors } from "@/actions/account-sharing";
import { Eye, ShoppingCart, Banknote } from "lucide-react";

type Row = NonNullable<Awaited<ReturnType<typeof listAcceptedSharesWithGrantors>>["rows"]>[number];

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
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Accounts shared with you</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only views of a partner&apos;s data. Open a hub for My Expenses or to-buy, depending on what they allowed.
      </p>

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
          rows.map(({ share, grantorUserId }) => (
            <Card key={share.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Shared account</CardTitle>
                <CardDescription className="text-xs">Partner user ID: {grantorUserId.slice(0, 8)}…</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {share.can_view_expenses && (
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <Link href={`/shared/${grantorUserId}/my-expenses`}>
                      <Banknote className="h-4 w-4" />
                      My Expenses
                    </Link>
                  </Button>
                )}
                {share.can_view_to_buy && (
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <Link href={`/shared/${grantorUserId}/to-buy`}>
                      <ShoppingCart className="h-4 w-4" />
                      To-buy
                    </Link>
                  </Button>
                )}
                <Badge variant="secondary" className="ml-auto gap-1">
                  <Eye className="h-3 w-3" />
                  View only
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/settings/sharing">Manage sharing</Link>
        </Button>
      </div>
    </div>
  );
}
