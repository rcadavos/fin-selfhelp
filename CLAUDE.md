# OmniTrak — Claude Code Guidelines

## Project Overview

OmniTrak is a personal finance self-help app built with:
- **Framework**: Next.js 15 App Router (`"use client"` / RSC split)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data**: Supabase (auth + Postgres), React Query (`@tanstack/react-query`)
- **Charts**: Recharts
- **Auth context**: `src/contexts/user-context.tsx` — clears React Query cache on user switch

## Changelog Update Rule

**Every time you make a change (feature, fix, improvement, hotfix), you MUST update the changelog.**

### Files to update

1. **`src/lib/changelog.ts`** — add entries to the top release block, or create a new version block
2. **`src/lib/version.ts`** — bump the version if warranted (semver: patch for fixes, minor for features, major for breaking)

### Versioning guide — automated

Version bumping is **automatic on every `git commit`** via `.githooks/commit-msg`.

| Commit message prefix | Bump | Example |
|-----------------------|------|---------|
| `feat:` or `feat(scope):` | **Minor** — new feature | `1.2.0` → `1.3.0` |
| Anything else (`fix:`, `hotfix:`, `chore:`, etc.) | **Patch** | `1.2.0` → `1.2.1` |
| Message contains `[skip bump]` | **None** — skipped | (no change) |

The hook updates both `package.json` and `src/lib/version.ts` and auto-stages them into the commit.

**Manual overrides** (run before committing):
```bash
npm run version:patch   # force a patch bump
npm run version:minor   # force a minor bump
npm run version:major   # force a major bump
```

**Rule of thumb:**
- New page, new email, new user-facing feature → commit starts with `feat:` → minor
- Bug fix, UI tweak, copy change, improvement → any other prefix → patch
- Breaking change / full rewrite → run `npm run version:major` first

### Changelog entry format

```ts
// In src/lib/changelog.ts → CHANGELOG array
{
  version: "1.2.0",
  date: "YYYY-MM-DD",          // use today's actual date
  summary: "One-line summary of this release.",
  changes: [
    { type: "feature",     description: "Short plain-English description." },
    { type: "improvement", description: "Short plain-English description." },
    { type: "fix",         description: "Short plain-English description." },
    { type: "hotfix",      description: "Short plain-English description." },
  ],
},
```

Valid `type` values: `"feature"` | `"improvement"` | `"fix"` | `"hotfix"`

---

## Architectural Conventions

### Auth & data fetching
- Always use `useUser()` hook for the current user — never read Supabase session directly in components.
- Query options live in `src/lib/query/`. Add new ones there.
- `staleTime: Infinity` is used for subscription status — the cache is cleared by `user-context.tsx` on auth change, so this is intentional.
- Always use `useSuspenseQuery` (from `@tanstack/react-query`) instead of `useQuery` for data fetching in components — it eliminates `isLoading`/`isPending` branching and guarantees data is defined.
- Wrap any component that uses `useSuspenseQuery` in a `<Suspense fallback={…}>` boundary (from `react`) so loading states are handled declaratively at the page or section level, not inline.

### Routing
- App pages live under `src/app/(main)/dashboard/` and are wrapped by `AppShell`.
- Legal pages live under `src/app/(legal)/legal/`.
- Account pages live under `src/app/account/`.

### Search
- Add every new navigable page to `src/lib/search-index.ts` so it appears in the header search.

### Sidebar nav
- Add every new dashboard page to the `navItems` array in `src/components/app/app-sidebar.tsx`.

### Mobile bottom navbar
- `src/components/app/bottom-navbar.tsx` — only 5 items max; only add top-level destinations here.

### Subscription gating
- Use `subscriptionStatusQueryOptions()` from `src/lib/query/subscription-user` to check plan.
- Pro features: email reminders. Free features: due dates, all core tracking.
- Premium features: Rent Tracker, Payment Tracker.

### Constants
- Add every new constants `src/lib/constants` so it can be reusable to other components.

---

## Design & Responsiveness

### Responsive layout
- Every page must be **mobile, iPad, and tablet friendly**. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for all layout, spacing, and typography.
- All page content must be wrapped in a `container` class (e.g. `<div className="container mx-auto px-4">`) so content is centered and constrained on wide screens.
- Avoid fixed pixel widths on page-level elements — use `w-full`, `max-w-*`, and responsive grid/flex.
- Test layouts at mobile (375px), tablet (768px), and desktop (1280px) breakpoints before marking a page complete.

### Reusability
- **Components**: Before writing a new component, check `src/components/` for an existing one to extend. Extract any UI pattern used in 2+ places into a shared component.
- **Functions**: Shared utilities belong in `src/lib/utils/` or an appropriate `src/lib/` module — never duplicate logic across files.
- **Constants**: All magic strings, numbers, and config values go in `src/lib/constants/` so they are reusable and easy to update.
- **Query options**: All React Query options belong in `src/lib/query/` — never inline `queryFn` directly in a component.

### Performance & scalability
- Prefer **React Server Components** for data-fetching pages; only add `"use client"` when interactivity or browser APIs are required.
- Use `React.memo`, `useMemo`, and `useCallback` for expensive renders or stable references — but only when there is a measurable benefit, not by default.
- Paginate or virtualize any list that can grow unboundedly (transactions, history, etc.).
- Keep bundle size lean: import only what you need from libraries (e.g. named imports from `lucide-react`, not the whole package).
- Images should use `next/image` with explicit `width`/`height` or `fill` for automatic optimization.

### Confirmation dialogs
Never use the native browser `confirm()`. Whenever an action needs user confirmation, use a reusable confirmation modal built on top of `src/components/ui/dialog.tsx`. If one does not exist yet, create `src/components/app/confirm-dialog.tsx` and use it everywhere.

### Calendar / date picker
Always use the shared `src/components/ui/calendar.tsx` component whenever a calendar or date picker is needed. Never reach for a third-party date picker or build a custom one.

### Text separators
Use `•` as the separator character whenever inline text items need to be separated (e.g. meta info lines, tag lists, stat labels). Never use `/`, `|`, or `-` as inline text separators in the UI.

### Compact instructions
When you are using compact, please focus on test output and code changes
