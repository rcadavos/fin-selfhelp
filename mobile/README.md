# OmniTrak mobile

The iOS and Android app, built with Expo (SDK 57) and Expo Router. It lives beside the
Next.js web app and uses the same Supabase project.

## Run it

```bash
cd mobile
cp .env.example .env      # fill in the three EXPO_PUBLIC_* values
npm install
npm start                 # then press a (Android), i (iOS, macOS only) or w (web)
```

To try it on a phone, install **Expo Go** and scan the QR code `npm start` prints. The
phone and the computer need to be on the same network.

`EXPO_PUBLIC_WEB_URL` is where the app opens web-only pages (sign-up, password reset,
"Open the full app"). `http://localhost:3003` only works in a simulator on the same
machine. On a real phone, use the deployed site or your computer's LAN IP.

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm start`         | Dev server with QR code             |
| `npm run typecheck` | `tsc --noEmit`                      |
| `npm run lint`      | ESLint with `eslint-config-expo`    |

## How it is put together

```
src/
  app/                  Expo Router routes (screens and layouts only)
    _layout.tsx         Providers + auth gate (Stack.Protected)
    sign-in.tsx         Password • Google • emailed sign-in link
    auth/callback.tsx   Where Google and sign-in links return (deep link)
    (tabs)/             Dashboard • Accounts • More
  components/
    ui/                 Primitives: Button, Input, Card, Skeleton
    app/                App shell: Screen, ThemeRoot, ConfirmDialog, RouteErrorBoundary
    accounts/           Feature components
  contexts/             UserProvider / useUser
  lib/
    api/                Data access: direct Supabase calls (the mobile "server actions")
    query/              React Query options and keys
    constants/          env, app name, web routes
    utils/
  constants/theme.ts    Color palette (mirrors the web's globals.css)
```

### Data: Supabase directly, guarded by RLS

The web app reads and writes through Next.js server actions, and a native app cannot
call those. Instead `src/lib/api/*` queries Supabase with the signed-in user's session,
and Row Level Security keeps each user to their own rows. These are the same policies
the web's browser client already depends on.

Anything that needs the service-role key or a server secret (PayMongo, AI, admin, cron)
must **not** move into the app. Expose it as a web API route that accepts the user's
access token (`Authorization: Bearer …`) and call that route from `src/lib/api`. On the
web side, `getUserFromBearer()` in `src/lib/supabase/bearer.ts` resolves the user from
that header (see `src/app/api/auth/mobile-sign-in/route.ts`).

### Sign-in

Password, Google and emailed sign-in links all work in the app. Google and the emailed
link use PKCE: Supabase sends the user back to `omnitrak://auth/callback?code=…`, and only
this install can redeem that code. That means an emailed link has to be opened on the
same phone.

After every sign-in the app calls `POST /api/auth/mobile-sign-in` on the web app. That
runs the step the web's `/auth/callback` would have run: the one-time "new signup"
alert to the team. The call is best effort, so if the web app is unreachable the
sign-in still works and the next sign-in retries.

**One-time Supabase setup.** In the Supabase dashboard, under **Authentication → URL
Configuration → Redirect URLs**, add:

- `omnitrak://auth/callback` for development and store builds
- `exp://**` for Expo Go, which returns to `exp://<your-ip>:8081/--/auth/callback`

If a URL is missing from that list, Supabase silently sends the user to the web
**Site URL** instead, and the app never gets the code.

### Code shared with the web app: `@shared/*`

`@shared/*` resolves to `../src/lib/shared/*`, a folder in the web app. Metro bundles it
from there (see `watchFolders` in `metro.config.js`). Put logic in that folder when both
apps need it: row mappers, balance math, number formatting.

Files in `src/lib/shared` must:

- have **no runtime imports** from packages (type-only imports are fine), and
- use **relative imports only**. In this project `@/` means `mobile/src`, not the web's `src`.

### Styling

NativeWind 4 (Tailwind 3), with the same token names as the web: `bg-background`,
`text-muted-foreground`, `bg-primary`, `bg-panel`, and so on. The values live in
`src/constants/theme.ts`. `ThemeRoot` applies them as CSS variables and switches
light/dark with the system setting. For props that need a raw color (icons, tab bar,
`RefreshControl`), use `useThemeColors()`.

### Conventions carried over from the web

- `useSuspenseQuery` / `useSuspenseQueries` inside a `<Suspense>` boundary, never `useQuery`.
- Every route that suspends re-exports `RouteErrorBoundary` as `ErrorBoundary`.
- Confirmations use `ConfirmDialog`. `Alert.alert` does nothing on web.
- Separate inline metadata with `•`.
- Content sits in a centered `max-w-2xl` column so tablets don't stretch it edge to edge.

## Before the first store build

- The bundle ID / Android package is `cloud.omnitrak.app`, the reverse of the domain we own
  (omnitrak.cloud). It cannot change once the app is published.
- Replace the icons in `assets/images/` with a high-resolution master. The current ones
  are upscaled from the 379 px web favicon.
- Set up EAS (`npx eas-cli init`, then `eas build`).
