import Image from "next/image";
import { getBankLogoSlug } from "@/lib/constants/account-institutions";
import { cn } from "@/lib/utils";
import type { AccountRow } from "@/lib/shared/accounts";

/** Two letters to stand in for a logo: the first letter of the first two words, or the first two letters. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;
  return letters.toUpperCase();
}

/**
 * An account's tile: the bank or e-wallet logo when there is one, otherwise the
 * account's initials. The tile is tinted with the colour picked for the account,
 * which is the only place that colour shows on a card.
 */
export function AccountLogo({
  account,
  className,
}: {
  account: Pick<AccountRow, "account_alias" | "bank_name" | "color">;
  className?: string;
}) {
  const slug = getBankLogoSlug(account.bank_name);

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border text-[11px] font-semibold tracking-wide text-foreground",
        className,
      )}
      style={{ backgroundColor: `${account.color}1F`, borderColor: `${account.color}66` }}
    >
      {slug ? (
        <Image
          src={`/images/bank-logo/${slug}.webp`}
          alt={account.bank_name}
          width={22}
          height={22}
          className="size-[22px] rounded-[5px] object-contain"
        />
      ) : (
        <span aria-hidden>{initials(account.account_alias)}</span>
      )}
    </span>
  );
}
