"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { ChevronDown, User, CreditCard, Shield, LogOut, Settings2 } from "lucide-react";

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const name = user?.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "Account";
}

export function AppHeader({ className }: { className?: string }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin(!!user);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="text-lg font-semibold">
          Self Help Finance
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-foreground">
                My Cashflow
              </Link>
              {isAdmin && (
                <Link href="/admin" prefetch={false} className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Settings2 className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 max-w-[200px] sm:max-w-[260px]">
                    <span className="truncate">{getDisplayName(user)}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      router.push("/subscription");
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/security" className="flex items-center gap-2 cursor-pointer">
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
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link href="/login" className="text-sm font-medium text-foreground">
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
