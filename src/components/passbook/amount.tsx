import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

/**
 * Banking-grade numeral display. Renders a currency figure in mono, tabular-nums,
 * with the currency symbol and the decimal fraction de-emphasized (Passbook look).
 *
 * Pass either a numeric `value` (formatted via the app's formatCurrency, honoring
 * currency prefs) or a pre-formatted string via `formatted` (for static marketing
 * copy). Applies the shared `.figure` utility from globals.css.
 */
function splitFigure(s: string): { symbol: string; main: string; dec: string } {
  // Leading currency symbol = run of non-digit, non-minus chars at the start.
  const symMatch = s.match(/^[^\d-]+/);
  const symbol = symMatch ? symMatch[0] : "";
  let rest = s.slice(symbol.length);
  // Trailing decimal fraction ("." + digits).
  const decMatch = rest.match(/(\.\d+)$/);
  const dec = decMatch ? decMatch[1] : "";
  if (dec) rest = rest.slice(0, rest.length - dec.length);
  return { symbol, main: rest, dec };
}

export function Amount({
  value,
  formatted,
  currency,
  className,
}: {
  value?: number;
  formatted?: string;
  currency?: string;
  className?: string;
}) {
  const str = formatted ?? (typeof value === "number" ? formatCurrency(value, currency) : "");
  const { symbol, main, dec } = splitFigure(str);
  return (
    <span className={cn("figure", className)}>
      {symbol ? <span className="peso">{symbol}</span> : null}
      {main}
      {dec ? <span className="dec">{dec}</span> : null}
    </span>
  );
}
