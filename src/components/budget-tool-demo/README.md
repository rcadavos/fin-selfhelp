# Budget tool demo

Composable **cashflow preview** UI (net take-home → expenses by category → result + category breakdown). Built from shared `@/components/ui/*` primitives.

**Not wired** to any `src/app` route right now. Import from `@/components/budget-tool-demo` when you add a landing section, `/calculators` embed, or a dedicated demo page.

## Public exports

See `index.ts` — main pieces:

- `BudgetToolSection` — section shell, scroll target, headline
- `IncomeForm` — step 1
- `ExpensesForm` — step 2 (wraps category fetch in `Suspense`)
- `BudgetStatusCard` — summary + save/reset
- `ExpenseCategoryTable` — read-only breakdown table

## Files

| File | Role |
|------|------|
| `budget-tool-section.tsx` | Layout wrapper + `id="budget-tool"` |
| `income-form.tsx` | Net take-home input |
| `expenses-form.tsx` | Per-category amounts |
| `budget-status-card.tsx` | Aggregates + `ExpenseCategoryTable` |
| `expense-category-table.tsx` | TanStack table for category rows |
