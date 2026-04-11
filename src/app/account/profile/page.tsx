"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Loader2 } from "lucide-react";

function getNameFromMeta(meta: Record<string, unknown> | undefined): string {
  const name = meta?.full_name;
  return typeof name === "string" ? name.trim() : "";
}

function getPhoneForForm(user: {
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata?.phone;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  if (user.phone) return user.phone;
  return "";
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFullName(getNameFromMeta(user.user_metadata));
    setPhone(getPhoneForForm(user));
  }, [user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      },
    });
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Profile updated.");
  }

  if (loading || !user) {
    return (
      <main className="app-main-centered min-h-[40vh]">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Edit your name and phone. Your email is tied to sign-in and isn&apos;t editable here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email ?? ""} disabled readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Optional"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
              <Link
                href="/account/security"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Change password
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
