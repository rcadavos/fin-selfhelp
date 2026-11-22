import { TRIAL_DURATION_DAYS } from "./trial";

/**
 * Home-page copy and sample data. The figures are illustrative pesos for the
 * marketing page, not anyone's real bills.
 */

/** What signing up costs, printed on the CTA button's ticket stub. */
export const START_COST_DISPLAY = "₱0";

/** Label of the main sign-up call to action (header, hero, closing band). */
export const TRIAL_CTA_LABEL = `Start free ${TRIAL_DURATION_DAYS}-day trial`;

export type HeroSampleBillStatus = "due" | "paid" | "scheduled";

export type HeroSampleBill = {
  name: string;
  /** Pesos. Due bills add up to the ledger's "Still to pay" total. */
  amount: number;
  /** The same amount as printed on the row, so every row keeps its centavos. */
  display: string;
  status: HeroSampleBillStatus;
  /** Shown on the stamp of a due bill, e.g. "Jul 15". */
  due?: string;
};

/** Month the hero's sample ledger is for. */
export const HERO_SAMPLE_MONTH = { name: "July", stamp: "JUL 2026" } as const;

/** The hero's sample ledger. Visitors can mark the due ones paid. */
export const HERO_SAMPLE_BILLS: readonly HeroSampleBill[] = [
  { name: "Meralco", amount: 3214.57, display: "₱3,214.57", status: "due", due: "Jul 15" },
  { name: "Maynilad", amount: 486.2, display: "₱486.20", status: "paid" },
  { name: "Globe Fiber", amount: 1699, display: "₱1,699.00", status: "due", due: "Jul 18" },
  { name: "Netflix", amount: 549, display: "₱549.00", status: "paid" },
  { name: "Pag-IBIG MP2", amount: 1000, display: "₱1,000.00", status: "scheduled" },
];

export type SignupReceiptLine = {
  label: string;
  value: string;
  /** Print the value as a money figure (mono, peso de-emphasized). */
  figure?: boolean;
};

/** The closing band's "cost to start" receipt. */
export const SIGNUP_RECEIPT_LINES: readonly SignupReceiptLine[] = [
  { label: "Free plan", value: "₱0.00", figure: true },
  { label: `${TRIAL_DURATION_DAYS}-day Pro trial`, value: "₱0.00", figure: true },
  { label: "Card required", value: "No" },
  { label: "Bank linking", value: "Not needed" },
];

export const SIGNUP_RECEIPT_TOTAL = "₱0.00";
