/** Valid values for `?type=` on `/dashboard/my-expenses`. */
export type ExpenseCadenceTypeParam = "monthly" | "quarterly" | "yearly";

export function parseExpenseCadenceTypeParam(
  value: string | null | undefined
): ExpenseCadenceTypeParam | null {
  if (value === "monthly" || value === "quarterly" || value === "yearly") return value;
  return null;
}
