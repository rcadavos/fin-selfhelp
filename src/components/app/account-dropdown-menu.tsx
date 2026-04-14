"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
import { CreditCard, LogOut, Shield, SlidersHorizontal, User as UserIcon } from "lucide-react";

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
  const showAvatar = Boolean(avatarUrl && !avatarFailed);
  const email = user?.email?.trim() ?? "";
  const showEmailSubline =
    Boolean(email) && displayName.trim().toLowerCase() !== email.toLowerCase();

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.id, avatarUrl]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-64">
        <DropdownMenuLabel className="px-2 py-2.5 font-normal">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-border/60">
              {showAvatar ? (
                <img
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
              <p className="truncate text-sm font-medium leading-tight text-foreground">{displayName}</p>
              {showEmailSubline ? (
                <p className="truncate text-xs leading-tight text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="flex cursor-pointer items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/profile" className="flex cursor-pointer items-center gap-2">
            <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2"
          onSelect={(e) => {
            e.preventDefault();
            router.push("/account/subscription");
          }}
        >
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security" className="flex cursor-pointer items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e: Event) => {
            e.preventDefault();
            signOut();
          }}
          className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
