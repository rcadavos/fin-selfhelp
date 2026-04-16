"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getAccountAvatarUrl } from "@/components/app/account-dropdown-menu";
import {
  AVATAR_BUCKET,
  avatarObjectPath,
  validateAvatarFile,
} from "@/lib/profile-avatar";
import { cn } from "@/lib/utils";
import { Loader2, User as UserIcon, Camera, Trash2 } from "lucide-react";

type ProfileAvatarUploaderProps = {
  user: User;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

export function ProfileAvatarUploader({ user, showError, showSuccess }: ProfileAvatarUploaderProps) {
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = getAccountAvatarUrl(user);
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  const customAvatarRaw = userMeta?.app_avatar_url;
  const legacyCustomAvatarRaw = userMeta?.avatar_url;
  const hasCustomAvatarUrl =
    (typeof customAvatarRaw === "string" && customAvatarRaw.trim().length > 0) ||
    (typeof legacyCustomAvatarRaw === "string" &&
      legacyCustomAvatarRaw.includes("/storage/v1/object/public/avatars/"));

  useEffect(() => {
    setAvatarBroken(false);
  }, [user.id, avatarUrl]);

  async function handleAvatarFile(file: File) {
    const err = validateAvatarFile(file);
    if (err) {
      showError(err);
      return;
    }
    setAvatarBusy(true);
    const supabase = createClient();
    const path = avatarObjectPath(user.id);
    const { error: uploadErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (uploadErr) {
      setAvatarBusy(false);
      showError(uploadErr.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const busted = `${publicUrl}?t=${Date.now()}`;
    const { error: authErr } = await supabase.auth.updateUser({
      data: { app_avatar_url: busted },
    });
    setAvatarBusy(false);
    if (authErr) {
      showError(authErr.message);
      return;
    }
    showSuccess("Profile photo updated.");
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    const supabase = createClient();
    const path = avatarObjectPath(user.id);
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    const { error: authErr } = await supabase.auth.updateUser({
      data: { app_avatar_url: "" },
    });
    setAvatarBusy(false);
    if (authErr) {
      showError(authErr.message);
      return;
    }
    showSuccess("Profile photo removed.");
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className={cn(
          "relative flex h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted ring-2 ring-background"
        )}
      >
        {avatarUrl && !avatarBroken ? (
          <img
            src={avatarUrl}
            alt=""
            width={112}
            height={112}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setAvatarBroken(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <UserIcon className="h-14 w-14" aria-hidden />
          </span>
        )}
        {avatarBusy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP up to 2MB. Shown in the account menu and where your name appears.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleAvatarFile(f);
          }}
        />
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={avatarBusy}
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" aria-hidden />
            Upload photo
          </Button>
          {hasCustomAvatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={avatarBusy}
              onClick={() => void handleRemoveAvatar()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
