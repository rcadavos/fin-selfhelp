import { cn } from "@/lib/utils";

/** Shared copy for Account sharing settings and “Shared with me”. */
export function PartnerAccessInfo({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm text-muted-foreground", className)}>
      <p className="text-xs text-muted-foreground">
        Sending invites and changing what you share requires an active Pro or Premium subscription on your account.
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <span className="text-foreground">Bills</span> — Your partner can view your bills for the current month
          and mark them paid or unpaid. They cannot change amounts, add, or remove bills.
        </li>
        <li>
          <span className="text-foreground">To-buy</span> — They can see your list and check items off when something is
          bought or handled. Only you can add or remove items from your list.
        </li>
      </ul>
    </div>
  );
}
