"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptAccountShare } from "@/actions/account-sharing";
import { useUser } from "@/hooks/use-user";
import { CheckCircle2, XCircle } from "lucide-react";

export function AcceptShareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  const shareId = searchParams.get("share") ?? "";
  const token = searchParams.get("token") ?? "";

  const canAccept = useMemo(() => Boolean(shareId && token), [shareId, token]);

  if (loading) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) {
    router.replace(`/login?next=${encodeURIComponent(`/settings/sharing/accept?share=${shareId}&token=${token}`)}`);
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Redirecting to sign in…</p>
      </main>
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
    <div className="container mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Accept invite</CardTitle>
          <CardDescription>Link this account to a partner who shared with you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Link href="/shared">Shared with me</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/sharing">Sharing settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
