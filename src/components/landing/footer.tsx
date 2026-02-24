import Link from "next/link";
import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t px-4 py-8 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Self Help Finance — simple budget tracking for everyone.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <Link href="/admin" prefetch={false} className="hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
