"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { ChevronDown, User, Shield, LogOut, Sun, Moon, Monitor } from "lucide-react";

type HeaderProps = {
  className?: string;
};

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const name = user?.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "Account";
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();
  const isMyCashflow = pathname?.startsWith("/my-cashflow");
  const isMyNetWorth = pathname?.startsWith("/my-net-worth");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold">
          Financial Tracker
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" asChild className={cn(isMyCashflow && "bg-primary/10 text-primary font-semibold")}>
                    <Link href="/my-cashflow">My Cashflow</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild className={cn(isMyNetWorth && "bg-primary/10 text-primary font-semibold")}>
                    <Link href="/my-net-worth">My Net Worth</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 max-w-[140px] sm:max-w-[200px]">
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
                      <DropdownMenuItem asChild>
                        <Link href="/profile/security" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="h-4 w-4" />
                          Security (change password)
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">Theme</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
                            <DropdownMenuRadioItem value="light" className="cursor-pointer gap-2">
                              <Sun className="h-4 w-4" />
                              Light
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="dark" className="cursor-pointer gap-2">
                              <Moon className="h-4 w-4" />
                              Dark
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="system" className="cursor-pointer gap-2">
                              <Monitor className="h-4 w-4" />
                              System
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
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
                </div>
              ) : (
                <>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/signup">Get started</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
