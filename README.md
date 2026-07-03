# OmniTrak

**Live:** https://omnitrak.cloud/

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

