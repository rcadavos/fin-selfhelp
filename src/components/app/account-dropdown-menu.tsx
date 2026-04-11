"use client";

import type { ReactNode } from "react";
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
import { CreditCard, LogOut, Shield, SlidersHorizontal, User as UserIcon, UsersRound } from "lucide-react";

export function getAccountDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const name = user?.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "Account";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-56">
        {user?.email && (
          <>
            <DropdownMenuLabel className="truncate px-2 py-1.5 font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/shared" className="flex cursor-pointer items-center gap-2">
            <UsersRound className="h-4 w-4" />
            Shared with me
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex cursor-pointer items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2"
          onSelect={(e) => {
            e.preventDefault();
            router.push("/subscription");
          }}
        >
          <CreditCard className="h-4 w-4" />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/security" className="flex cursor-pointer items-center gap-2">
            <Shield className="h-4 w-4" />
            Password & Security
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
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
