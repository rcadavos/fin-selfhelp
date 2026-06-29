"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ContentHeader } from "@/components/app/content-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { updatePrivacySettings, deleteSelfAccount } from "@/actions/auth";
import { ArrowUpRight, Download, Loader2, Lock } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();
  const { showError, showSuccess } = useSnackbar();

  const [profileVisible, setProfileVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    setProfileVisible(meta.profile_visible !== false);
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await updatePrivacySettings({ profileVisible, phoneVisible: false });
    if (error) {
      showError(error);
    } else {
      await refreshUser();
      showSuccess("Privacy settings saved.");
    }
    setSaving(false);
  }

  function handleExport() {
    const meta = user?.user_metadata ?? {};
    const data = {
      id: user?.id,
      email: user?.email,
      full_name: meta.full_name ?? null,
      phone: meta.phone ?? user?.phone ?? null,
      created_at: user?.created_at,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omnitrak-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const { error } = await deleteSelfAccount();
    if (error) {
      showError(error);
      setDeleting(false);
      return;
    }
    router.replace("/");
  }

  if (loading || !user) {
    return (
      <main className="app-main-centered min-h-[40vh]">
        <DashboardSkeleton variant="page" />
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2 space-y-4">
      <ContentHeader
        title="Privacy"
        subtitle="Control who can see your information and how your data is used."
        icon={Lock}
        className="mb-6"
      />

      {/* Profile visibility */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile visibility</CardTitle>
          <CardDescription>
            Control what other subdivision members can see about you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <Label htmlFor="profile-visible" className="text-sm font-medium leading-snug">
                Show my profile to members
              </Label>
              <p className="text-xs text-muted-foreground leading-snug">
                When enabled, members may be able to see your profile name and avatar on your blog posts.
              </p>
            </div>
            <ToggleSwitch
              id="profile-visible"
              checked={profileVisible}
              onCheckedChange={setProfileVisible}
              className="shrink-0 mt-0.5"
            />
          </div>

          <div className="pt-1">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Your data */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your data</CardTitle>
          <CardDescription>
            You have the right to access, export, and understand how your data is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" aria-hidden />
              Export my data
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/legal/privacy">
                Privacy policy
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Deleting…
              </>
            ) : (
              "Delete account"
            )}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete your account?"
        description="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </main>
  );
}
