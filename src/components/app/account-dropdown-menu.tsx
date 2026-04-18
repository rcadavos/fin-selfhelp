"use client";

import type { ReactNode } from "react";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CreditCard, LogOut, Shield, SlidersHorizontal, User as UserIcon, UsersRound } from "lucide-react";

export function getAccountDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user?.user_metadata;
  const fullName = meta?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const name = meta?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "Account";
}

/** Avatar URL from OAuth / provider metadata (Google uses `picture`, others often `avatar_url`). */
export function getAccountAvatarUrl(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user?.user_metadata;
  if (!meta) return null;
  const appAvatar = typeof meta.app_avatar_url === "string" ? meta.app_avatar_url.trim() : "";
  if (appAvatar) return appAvatar;
  const raw =
    (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta.picture === "string" && meta.picture.trim()) ||
    (typeof meta.image === "string" && meta.image.trim()) ||
    "";
  return raw || null;
}

type AccountDropdownMenuProps = {
  user: User;
  trigger: ReactNode;
  /** Radix content align */
  align?: "start" | "center" | "end";
  /** Prefer opening above trigger (sidebar footer) */
  side?: "top" | "bottom";
};

export function AccountDropdownMenu({
  user,
  trigger,
  align = "end",
  side = "bottom",
}: AccountDropdownMenuProps) {
  const router = useRouter();
  const displayName = getAccountDisplayName(user);
  const avatarUrl = getAccountAvatarUrl(user);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMountedRef = useRef(false);
  const showAvatar = Boolean(avatarUrl && !avatarFailed);
  const email = user?.email?.trim() ?? "";
  const showEmailSubline =
    Boolean(email) && displayName.trim().toLowerCase() !== email.toLowerCase();

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.id, avatarUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const supabase = createClient();
    // Clear client state first so UI transitions immediately.
    const { error: localError } = await supabase.auth.signOut({ scope: "local" });
    if (localError) {
      console.error("Local sign out failed:", localError.message);
    }
    router.replace("/");
    router.refresh();
    // Best effort server cookie/session cleanup; don't block navigation on this.
    void signOut().then((res) => {
      if (res?.error) {
        console.error("Server sign out failed:", res.error);
      }
    });
    if (isMountedRef.current) setIsSigningOut(false);
  };

  const triggerNode =
    isValidElement<{ className?: string }>(trigger) && typeof trigger.props === "object"
      ? cloneElement(trigger, {
          className: cn(trigger.props.className, "group"),
        })
      : trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-72 overflow-hidden p-0 md:w-60">
        <DropdownMenuLabel className="bg-gradient-to-br from-primary/90 to-primary/70 px-3 py-3 font-normal text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/20 text-primary-foreground ring-1 ring-white/35">
              {showAvatar ? (
                <Image
                  src={avatarUrl!}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <UserIcon className="h-5 w-5" aria-hidden />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium leading-tight text-primary-foreground">
                {displayName}
              </p>
              {showEmailSubline ? (
                <p className="truncate text-xs leading-tight text-primary-foreground/80">{email}</p>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="p-1">
          <DropdownMenuItem asChild className="min-h-9 px-2.5 text-sm [&_svg]:size-4">
            <Link href="/account/profile" className="flex cursor-pointer items-center gap-2.5">
              <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-9 px-2.5 text-sm [&_svg]:size-4">
            <Link href="/account/security" className="flex cursor-pointer items-center gap-2.5">
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              Security
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex min-h-9 cursor-pointer items-center gap-2.5 px-2.5 text-sm [&_svg]:size-4"
            onSelect={(e) => {
              e.preventDefault();
              router.push("/account/subscription");
            }}
          >
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
            Subscription
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-9 px-2.5 text-sm [&_svg]:size-4">
            <Link href="/account/shared" className="flex cursor-pointer items-center gap-2.5">
              <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
              Shared with me
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-9 px-2.5 text-sm [&_svg]:size-4">
            <Link href="/account/settings" className="flex cursor-pointer items-center gap-2.5">
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              void handleLogout();
            }}
            disabled={isSigningOut}
            className="flex min-h-9 cursor-pointer items-center gap-2.5 px-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive dark:hover:bg-destructive/15 dark:focus:bg-destructive/15 dark:focus-visible:bg-destructive/15 dark:data-[highlighted]:bg-destructive/15 [&_svg]:size-4"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {isSigningOut ? "Logging out…" : "Logout"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
