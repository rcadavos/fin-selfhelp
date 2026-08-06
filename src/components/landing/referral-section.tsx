import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { Stamp } from "@/components/passbook/stamp";
import {
  REFERRAL_CONVERSION_REWARD_MONTHS,
  REFERRAL_SIGNUPS_PER_REWARD,
  REFERRAL_SIGNUP_REWARD_MONTHS,
} from "@/lib/constants/referral";

const rewards = [
  {
    num: "01",
    metric: `${REFERRAL_SIGNUPS_PER_REWARD} friends join`,
    reward: `${REFERRAL_SIGNUP_REWARD_MONTHS} free month of Pro`,
    description: `Stackable. Ten friends is two free months, fifteen is three — every ${REFERRAL_SIGNUPS_PER_REWARD} signups adds another.`,
  },
  {
    num: "02",
    metric: "A friend upgrades to Pro",
    reward: `${REFERRAL_CONVERSION_REWARD_MONTHS} more free month`,
    description:
      "Paid on top of your signup milestones, once per friend who starts a paid plan. Also stackable.",
  },
];

/** Worked example, so the stacking rule is obvious without doing the maths. */
const ledger = [
  { label: "10 friends joined", value: "2 months", stamped: false },
  { label: "3 of them upgraded to Pro", value: "3 months", stamped: false },
  { label: "Total free Pro", value: "5 months", stamped: true },
];

export function ReferralSection({ className }: { className?: string }) {
  return (
    <section
      id="referrals"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          Invite friends, earn free Pro
        </h2>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">
          Every account gets a personal invite link. Share it, and the free months stack up — no cap,
          no promo codes to chase.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 border-t border-hairline-strong sm:grid-cols-2">
              {rewards.map((item, i) => (
                <div
                  key={item.num}
                  className={cn(
                    "border-border py-7 pr-5 sm:pr-6",
                    i > 0 && "border-t sm:border-l sm:border-t-0 sm:pl-6"
                  )}
                >
                  <span className="font-mono text-[11px] font-medium tracking-wider text-primary">
                    {item.num}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-foreground">{item.metric}</h3>
                  <p className="mt-1 text-[15px] font-medium text-primary">{item.reward}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Rewards land automatically and extend whenever your Pro access currently ends — nothing
              to claim.
            </p>

            <Button asChild className="mt-6 h-11 w-full sm:w-auto sm:min-w-[13rem]">
              <Link href="/signup">Get your invite link</Link>
            </Button>
          </div>

          {/* Worked example, in the app's own statement style. */}
          <div className="lg:col-span-5">
            <div className="rounded-md border border-border bg-card p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Example
              </p>
              <div className="mt-4 space-y-3 text-sm">
                {ledger.map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(i === ledger.length - 1 && "border-t border-border pt-3")}
                  >
                    <LedgerRow
                      label={
                        <span className={cn(row.stamped ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {row.label}
                        </span>
                      }
                    >
                      {row.stamped ? (
                        <Stamp variant="paid">{row.value}</Stamp>
                      ) : (
                        <span className="whitespace-nowrap font-mono text-xs text-foreground">
                          +{row.value}
                        </span>
                      )}
                    </LedgerRow>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Signup milestones and upgrade rewards are paid separately, so a friend who joins and
                then upgrades counts toward both.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
