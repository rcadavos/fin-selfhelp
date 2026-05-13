import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type BackLinkProps = {
  href: string;
  /** Destination label, e.g. "Legal" renders as "Back to Legal". */
  label: string;
  className?: string;
};

export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      Back to {label}
    </Link>
  );
}
