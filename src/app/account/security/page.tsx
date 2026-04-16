"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";

export default function ProfileSecurityPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value ?? "";
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement)?.value ?? "";
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Password updated.");
    router.push("/account/profile");
  }

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Repeat password"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Change password</Button>
              <Button variant="outline" asChild>
                <Link href="/account/profile">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
