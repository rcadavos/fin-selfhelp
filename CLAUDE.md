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

### Versioning guide

**The top entry of `src/lib/changelog.ts` is the single source of truth for the release number.**

`.githooks/pre-commit` runs `scripts/sync-version.mjs`, which copies that version into
`package.json` and `src/lib/version.ts` and stages them. It is a no-op when they already
agree, so a commit that adds no changelog entry changes no version.

To cut a release, either set the version on the new changelog entry by hand, or run:

```bash
npm run version:patch   # bug fix, UI tweak, copy change, improvement
npm run version:minor   # new page, new email, new user-facing feature
npm run version:major   # breaking change / full rewrite
```

These raise the version on the **top changelog entry** and sync the other two files.

**The commit message prefix does not affect the version.** Pick the prefix that describes
the change (`fix:`, `chore:`, `refactor:`, `feat:` …) and choose the release size
separately, above.

Two traps this layout exists to avoid — do not reintroduce either:

- **Never move version syncing into `commit-msg`.** A `git add` there does not reach the
  commit being created; git has already snapshotted the index. The old hook printed a
  bump it never committed and left the version files staged for the *next* commit, so the
  app shipped a commit whose `version.ts` said `1.7.5` while its own changelog entry
  announced `1.8.0`.
- **Never locate the changelog entry by searching for the current version string.** When
  the new top entry already carries the target version, that search falls through to an
  older entry and renames an already-released one, leaving two entries claiming the same
  release. Target the top entry by position instead.

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
- **Always use `useSuspenseQuery` (from `@tanstack/react-query`) instead of `useQuery` for data fetching in components.** It eliminates `isLoading`/`isPending` branching, guarantees `data` is defined (so drop `= []`/`= {}` fallbacks on the destructure), and — critically — prevents the "Hydration failed… server rendered text didn't match the client" error that `useQuery` causes when the server renders empty data while the client already has it cached. With Suspense, the first client render is resolved from the same hydrated cache as the server, so they always match.
- Wrap any component that uses `useSuspenseQuery` in a `<Suspense fallback={…}>` boundary (from `react`) so loading states are handled declaratively at the page or section level, not inline.
- For SSR pages, the server component must `prefetchQuery` every query the children will read and wrap them in a `<HydrationBoundary state={dehydrate(queryClient)}>` (see `src/app/(main)/dashboard/accounts/page.tsx`). Otherwise `useSuspenseQuery` will fire the server action during SSR and suspend the whole page.
- **The only acceptable reasons to keep `useQuery`** are: a conditional/dependent query that needs `enabled` (unsupported by `useSuspenseQuery`), or polling/`refetchInterval` UI where you intentionally render a non-suspending loading state. If you reach for `useQuery`, leave a one-line comment saying why. Everything else must be `useSuspenseQuery`.

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
- **NEVER use a raw `<img>` tag.** Always use `import Image from "next/image"` with explicit `width`/`height` or `fill`. For dynamic external URLs (e.g. Supabase storage, OAuth avatars) or data URLs, add the `unoptimized` prop. The only exception is `src/app/opengraph-image.tsx`, which runs inside Satori's `ImageResponse` renderer where `next/image` is not supported.
- **NEVER use a raw `<script>` tag.** Always use `import Script from "next/script"` with an appropriate `strategy` (`afterInteractive`, `lazyOnload`, etc.) for any third-party or inline scripts.

### Confirmation dialogs
Never use the native browser `confirm()`. Whenever an action needs user confirmation, use a reusable confirmation modal built on top of `src/components/ui/dialog.tsx`. If one does not exist yet, create `src/components/app/confirm-dialog.tsx` and use it everywhere.

### Calendar / date picker
Always use the shared `src/components/ui/calendar.tsx` component whenever a calendar or date picker is needed. Never reach for a third-party date picker or build a custom one.

### Text separators
Use `•` as the separator character whenever inline text items need to be separated (e.g. meta info lines, tag lists, stat labels). Never use `/`, `|`, or `-` as inline text separators in the UI.

### Preserving user edits
Always re-read a file immediately before editing it — never rely on what you wrote in a previous turn, because the user may have changed it since. Make only the changes the current instruction requires; leave every other line exactly as it is in the file at read time.

### Compact instructions
When you are using compact, please focus on test output and code changes

### Git
Do not run `git commit` unless the user explicitly asks. The user handles commits.
