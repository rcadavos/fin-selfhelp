"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string }) {
  const { user, loading } = useUser();

  if (loading || !user) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="text-lg font-semibold">
          Self Help Finance
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">My budget</span>
          <span className="max-w-[160px] truncate text-sm text-muted-foreground sm:max-w-[220px]">
            {user.email}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
