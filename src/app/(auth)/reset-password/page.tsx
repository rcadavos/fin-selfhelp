"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { AuthShell, PanelStatement, PanelRow, PanelValue } from "@/components/auth/passbook-panel";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showError } = useSnackbar();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      showError(err.message);
      return;
    }
    router.replace("/login?reset=success");
  }

  const panel = (
    <>
      <p className="max-w-[34ch] text-[15px] leading-relaxed text-panel-muted">
        Almost done. Choose a new password you&apos;ll remember — you can always reset it again later.
      </p>
      <div className="mt-7">
        <PanelStatement title="New password" meta="Almost done" label="Setting a new password">
          <PanelRow label="Reset link" value={<PanelValue>Verified</PanelValue>} />
          <PanelRow label="Minimum length" value={<PanelValue>6 chars</PanelValue>} />
          <PanelRow label="Next step" value={<PanelValue>Log in</PanelValue>} last />
        </PanelStatement>
      </div>
    </>
  );

  return (
    <AuthShell panel={panel}>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Set new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your new password below. You must use the link from your email to get here.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-11"
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
