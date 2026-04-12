# Agent guide — OmniTrak (fin-selfhelp)

Concise context for AI coding agents working in this repository.

## Product

Personal finance web app: landing, auth (Supabase), dashboard (expenses, cashflow, calculators), account settings, subscriptions, shared views. Branding in the repo may appear as **OmniTrak**; deployment/docs may reference **fin-track.cloud**.

## Stack

| Area | Choice |
|------|--------|
| Framework | **Next.js** (App Router), **React** |
| Language | **TypeScript** (`strict`; run `npx tsc --noEmit`) |
| Styling | **Tailwind CSS** + `tailwind-merge` / `cn()` in `src/lib/utils.ts` |
| UI primitives | Radix-based components under `src/components/ui/` |
| Data / auth | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) |
| Client cache | **TanStack React Query** (`src/lib/query/*`, providers in app layout) |

## Commands

```bash
npm run dev      # Next dev (Turbopack), port 3003
npm run build
npm run start
npm run lint
npx tsc --noEmit # Typecheck (no script; run explicitly before claiming “passes”)
```

On **Windows PowerShell**, chain commands with `;` instead of `&&` unless using a shell that supports `&&`.

## Repo layout (high level)

- `src/app/` — App Router routes, `layout.tsx`, `page.tsx`, route handlers, `loading.tsx` where present.
- `src/components/` — Feature UI (`dashboard/`, `landing/`, `app/`, `pages/`, etc.) and `components/ui/` (shared primitives).
- `src/components/budget-tool-demo/` — Standalone multi-step cashflow demo (not mounted on a route); see folder `README.md` and `index.ts` exports.
- `src/actions/` — **Server Actions** (`"use server"`), Supabase mutations, `revalidatePath` as needed.
- `src/lib/` — Helpers, Supabase clients/middleware, query options, domain logic (e.g. `expense-due-date.ts`, `paid-month.ts`).
- `src/hooks/` — Client hooks (`use-user`, etc.).
- `src/types/` — Shared types (`database.types.ts`, etc.).
- `supabase/migrations/` — SQL migrations (numbered). `supabase/setup.sql` is a bootstrap reference; prefer migrations for schema changes.

## Conventions

1. **TypeScript:** Prefer `type` over `interface` for object shapes (see `.cursor/rules/typescript-types.mdc`).
2. **Scope:** Match existing patterns; avoid drive-by refactors and unrelated files unless the task requires it.
3. **Imports:** Use `@/` path alias (e.g. `@/components/ui/button`).
4. **Server vs client:** Mark client components with `"use client"`; keep server components default where possible.
5. **Env:** `NEXT_PUBLIC_*` for browser; Supabase keys and secrets via `.env.local` (do not commit secrets). README documents `NEXT_PUBLIC_SITE_URL`, support email, etc.

## UI & styling

1. **Reusable components:** Prefer `@/components/ui/*` (Button, Card, Input, Skeleton, etc.) and existing feature components. Do not duplicate the same markup in multiple places—extract a small component or reuse a primitive.
2. **Tailwind only:** Style with utility classes on elements. Use `cn()` from `@/lib/utils` to merge conditional classes.
3. **Avoid custom CSS:** Do not add ad-hoc `<style>` blocks, inline `style={{}}` for layout/theme (exceptions: unavoidable third-party needs, e.g. dynamic conic-gradient values). Prefer `globals.css` only for app-wide tokens/base layers already in the project, not for one-off feature styling.

## Auth & data

- Session via Supabase; stale refresh handling lives in `src/lib/supabase/` and `src/hooks/use-user.ts` (local sign-out on invalid refresh).
- Expense data, payments, profiles: see `src/actions/budget.ts`, `src/actions/expense-payments.ts`, and RLS-oriented migrations.

## When changing UI

- Dashboard / My Expenses: `src/components/dashboard/expense-cashflow-page.tsx` (variants `dashboard` | `expenses`).
- Loading skeletons: `src/components/dashboard/dashboard-skeleton.tsx` + route `src/app/dashboard/**/loading.tsx` as applicable.
- To-Buy / To-Do: `src/components/pages/to-buy-list-page.tsx` + `src/lib/to-buy-storage.ts` and `src/actions/to-buy-db.ts` / `to-do-db.ts`.

## Verification

Before asserting a change is complete: run `npx tsc --noEmit` and, when relevant, `npm run lint` or exercise the affected route in `npm run dev`.
