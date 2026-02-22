"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  const { user, loading } = useUser();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold">
          Self Help Finance
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
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/dashboard">My budget</Link>
                  </Button>
                  <span className="max-w-[140px] truncate text-sm text-muted-foreground sm:max-w-[200px]">
                    {user.email}
                  </span>
                  <form action={signOut}>
                    <Button type="submit" variant="ghost" size="sm">
                      Sign out
                    </Button>
                  </form>
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
