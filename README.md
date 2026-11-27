# OmniTrak

**Live:** https://omnitrak.cloud/

## Database migrations

SQL lives in `supabase/migrations/`, one file per change, named `NNN_short_name.sql`
in sequence. Keep the numbering — create the next file by hand rather than with
`supabase migration new`, which would name it with a timestamp.

**Applying is automatic.** `.github/workflows/supabase-migrations.yml` runs
`supabase db push` against the hosted project whenever a push to `master` touches
`supabase/migrations/`. Pull requests that touch the same path get a
`--dry-run` instead, so a migration that would fail is caught before it reaches the
live schema. Runs are serialised and never cancelled mid-apply.

### One-time setup

1. Add two repository secrets (**Settings → Secrets and variables → Actions →
   Secrets**):
   - `SUPABASE_ACCESS_TOKEN` — a personal access token from
     <https://supabase.com/dashboard/account/tokens>.
   - `SUPABASE_DB_PASSWORD` — the database password from
     **Project Settings → Database**.

   They must be **repository** secrets. An *Environment* secret will not reach
   this job, which declares no environment — and a secret that does not exist
   resolves to an empty string rather than failing, which surfaces as the CLI
   saying `Access token not provided`. The workflow checks both up front and
   names whichever is missing.

   The project ref is not a secret and is set directly in the workflow.

2. **Baseline the existing history.** Every migration up to `094` was applied by
   hand in the SQL editor, so the database has the schema but no record of which
   files produced it. Left alone, the first push would try to replay all 94
   against a live schema. Mark them as already applied first:

   ```bash
   npm run db:link
   npm run db:list                          # Local | Remote, read-only
   npm run db:baseline -- --through 094     # dry run, prints what it would mark
   npm run db:baseline -- --through 094 --yes
   npm run db:list                          # every row should now show on both sides
   ```

   `--through` is the last migration you have actually run by hand. Anything after
   it stays pending and gets applied by the next push. Marking a migration applied
   when its SQL never ran means it is skipped permanently — so check the live
   schema before the `--yes`.

3. Set the repository **variable** `SUPABASE_MIGRATIONS_BASELINED` to `true`
   (**Settings → Secrets and variables → Actions → Variables**).

   Until this is set, the workflow refuses to apply anything — it links, prints
   the Local | Remote table and stops. That gate exists because step 2 is the one
   mistake here that cannot be undone from a re-run: without it, the first
   successful workflow run would replay all 94 migrations against the live
   schema. It is a one-time flag and never fires again once set.

### Running one by hand

```bash
npm run db:list   # what is applied where
npm run db:push   # apply pending migrations to the hosted project
```

Both need `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in your shell, and a
one-off `npm run db:link` first.

## SEO, Web Vitals & sharing

- **Metadata:** Root layout sets default title template (`%s | OmniTrak`), description, keywords, and per-route overrides for `/calculators`, `/login`, `/signup`, and calculator sub-routes.
- **Sharing (Open Graph & Twitter):** All supported meta tags are set via `src/lib/seo.ts`: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, plus canonical and `metadataBase`. OG image is generated at `src/app/opengraph-image.tsx` (1200×630).
- **Sitemap & robots:** `src/app/sitemap.ts` and `src/app/robots.ts` use `NEXT_PUBLIC_SITE_URL`; set it to your production URL so canonical, sitemap URL, and OG links are correct.
- **Structured data:** Root layout injects JSON-LD `WebApplication` schema for the homepage.
- **Viewport & theme:** `viewport` and `themeColor` (light/dark) are set in the root layout; fonts use `display: "swap"` for better LCP.
- **Manifest:** `src/app/manifest.ts` provides a web app manifest; add `public/favicon.ico` (and optional icons) for full support.

### Open Graph / Messenger / Facebook sharing

For links to show the correct image and title when shared (e.g. on Messenger or Facebook):

1. **Set the production URL** in your deployment environment (e.g. Vercel → Project → Settings → Environment Variables):
   ```bash
   NEXT_PUBLIC_SITE_URL=https://omnitrak.cloud
   ```
   Use your real domain (HTTPS). This is used for `og:image`, `og:url`, and canonical URLs. If unset, the app falls back to `https://omnitrak.cloud`.

2. **Re-fetch after deploy:** Facebook/Messenger cache OG data. After deploying, use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and enter `https://omnitrak.cloud` (or your URL), then click **Scrape Again** so the new meta tags and image are picked up.

3. **Check the image URL:** In production, open the page source or inspect the meta tags and confirm `<meta property="og:image" content="https://omnitrak.cloud/opengraph-image" />`. Then open `https://omnitrak.cloud/opengraph-image` in a browser; it should show the OmniTrak image (1200×630).

## Support / contact email (e.g. info@omnitrak.cloud)

1. **In the app (footer)**  
   Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPPORT_EMAIL=info@omnitrak.cloud
   ```
   The footer will show “Contact: info@omnitrak.cloud” with a `mailto:` link.

2. **Supabase auth emails (password reset, magic link, signup)**  
   To send those from `info@omnitrak.cloud`:
   - Supabase Dashboard → **Project** → **Authentication** → **Email Templates** (sender is set via SMTP).
   - Supabase Dashboard → **Project Settings** → **Auth** → **SMTP Settings**.
   - Enable **Custom SMTP**, set your SMTP host (e.g. your provider for omnitrak.cloud), and set the **Sender email** to `info@omnitrak.cloud` (and use a matching SMTP user/password).
   - If you don’t use custom SMTP, Supabase uses its default sender; the “from” address is then configured in **Email Templates** only if your plan allows it.

## Reminder emails (8:00 AM daily)

Reminder emails are sent from the cron route at `GET /api/cron/reminder-emails`.

- **Schedule:** `vercel.json` runs this route at `0 0 * * *` (00:00 UTC).  
  For Asia/Manila this is 8:00 AM local time.
- **Release gate:** the route only sends once the clock in **Asia/Manila** is ≥ 08:00, so the midnight-UTC cron run matches local morning (not UTC `getHours()`, which previously skipped every run).
- **Security:** the route requires `Authorization: Bearer <CRON_SECRET>`.
- **Email provider:** uses SMTP (e.g., Hostinger SMTP).

Set these env vars in deployment:

```bash
CRON_SECRET=your-long-random-secret
REMINDER_FROM_EMAIL="OmniTrak <reminders@yourdomain.com>"
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-mailbox@yourdomain.com
SMTP_PASS=your-mailbox-password
```

Notes:
- Reminders are currently sent for **Pro/Premium-capable** users.
- Sending is deduplicated by `reminder_email_logs` so each reminder key is emailed once.

## Push notifications (PWA)

The same cron run pushes every **new** in-app reminder (`user_notifications` row) to the devices the user turned push on for, on every plan. Users switch it on per device in **Settings → Notifications** or on **/account/notifications**.

- **Devices:** one row per browser in `push_subscriptions` (service role only). A row is deleted when its push service answers 404/410, and when the user signs out on that device.
- **Preferences:** push honours the **Notifications** master switch and **Bill reminders** in Settings → Notifications.
- **iPhone/iPad:** push works only from the app added to the Home Screen (iOS 16.4+), not a Safari tab.
- **Service worker:** `public/sw.js` handles `push` and `notificationclick`. It is auto-registered in production only. Locally, turning push on registers it.

Generate a key pair once with `npx web-push generate-vapid-keys` and set it in every environment. Changing the pair stops every existing device from receiving until its user turns push on again.

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:info@omnitrak.cloud
```

If the keys are not set, push stays off: the toggle reads "not available yet" and the cron skips it.

## Facebook Page (admin • Site settings)

`/admin/settings` shows the Page's live cover and profile picture, generates brand covers (1640 × 624) and profile pictures (720 × 720) to download, and runs a post queue: drafts, scheduled posts and Publish now. The same setup steps are on the page's **Setup** tab.

**Connect it with a Meta Business system user**, whose token doesn't expire when a person logs out, changes a password or leaves:

1. Business settings • Accounts • Pages: add the Page to your business portfolio.
2. developers.facebook.com: create an app with the "Manage everything on your Page" use case, connected to the same business. Fill in App settings • Basic and switch the app to **Live** (posts from an app in Development mode can be hidden from the public).
3. Business settings • Users • System users • Add, with the Admin role.
4. Assign assets: the Page (full control) and the app (full control).
5. Generate new token: pick the app, expiration **Never**, permissions `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. Copy it; Meta shows it once.

```bash
META_PAGE_ID=1234567890            # Page • About • Page transparency
META_SYSTEM_USER_TOKEN=EAAG...     # the system user's token; Page calls swap it for the Page's own token
META_APP_SECRET=...                # optional: signs every Graph call with appsecret_proof
```

**Scheduler:** `GET /api/cron/social-posts` (Bearer `CRON_SECRET`) publishes due posts, five per run, and does nothing while auto-publish is paused. Run it every 10 minutes through the edge function: `supabase functions deploy send-reminders`, then a Supabase cron job that POSTs to `https://<project-ref>.supabase.co/functions/v1/send-reminders?job=social` with `Authorization: Bearer <FUNCTION_SECRET>`, like the timed reminders job. A post is claimed before it is published, so it never goes out twice; one stuck mid-publish for 15 minutes is marked failed for you to check rather than retried.

**Photos:** the composer uploads to the public `social-post-images` bucket (migration 103; JPEG, PNG or GIF up to 4 MB). The browser sends the file straight to Storage through a one-time signed upload URL from an admin-checked server action, so the bucket needs no write policies and the file skips the server action body limit. Facebook fetches the photo from its public address at publish time. Uploads no post keeps (replaced, removed or cancelled) are deleted when the composer closes, and a post's photo is deleted with the post.
