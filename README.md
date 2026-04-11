# OmniTrak

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
   NEXT_PUBLIC_SITE_URL=https://fin-track.cloud
   ```
   Use your real domain (HTTPS). This is used for `og:image`, `og:url`, and canonical URLs. If unset, the app falls back to `https://fin-track.cloud`.

2. **Re-fetch after deploy:** Facebook/Messenger cache OG data. After deploying, use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and enter `https://fin-track.cloud` (or your URL), then click **Scrape Again** so the new meta tags and image are picked up.

3. **Check the image URL:** In production, open the page source or inspect the meta tags and confirm `<meta property="og:image" content="https://fin-track.cloud/opengraph-image" />`. Then open `https://fin-track.cloud/opengraph-image` in a browser; it should show the OmniTrak image (1200×630).

## Support / contact email (e.g. info@fin-track.cloud)

1. **In the app (footer)**  
   Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPPORT_EMAIL=info@fin-track.cloud
   ```
   The footer will show “Contact: info@fin-track.cloud” with a `mailto:` link.

2. **Supabase auth emails (password reset, magic link, signup)**  
   To send those from `info@fin-track.cloud`:
   - Supabase Dashboard → **Project** → **Authentication** → **Email Templates** (sender is set via SMTP).
   - Supabase Dashboard → **Project Settings** → **Auth** → **SMTP Settings**.
   - Enable **Custom SMTP**, set your SMTP host (e.g. your provider for fin-track.cloud), and set the **Sender email** to `info@fin-track.cloud` (and use a matching SMTP user/password).
   - If you don’t use custom SMTP, Supabase uses its default sender; the “from” address is then configured in **Email Templates** only if your plan allows it.

