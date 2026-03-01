# fin-selfhelp

## SEO, Web Vitals & sharing

- **Metadata:** Root layout sets default title template (`%s | Financial Tracker`), description, keywords, and per-route overrides for `/calculators`, `/login`, `/signup`, and calculator sub-routes.
- **Sharing (Open Graph & Twitter):** All supported meta tags are set via `src/lib/seo.ts`: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, plus canonical and `metadataBase`. OG image is generated at `src/app/opengraph-image.tsx` (1200×630).
- **Sitemap & robots:** `src/app/sitemap.ts` and `src/app/robots.ts` use `NEXT_PUBLIC_SITE_URL`; set it to your production URL so canonical, sitemap URL, and OG links are correct.
- **Structured data:** Root layout injects JSON-LD `WebApplication` schema for the homepage.
- **Viewport & theme:** `viewport` and `themeColor` (light/dark) are set in the root layout; fonts use `display: "swap"` for better LCP.
- **Manifest:** `src/app/manifest.ts` provides a web app manifest; add `public/favicon.ico` (and optional icons) for full support.

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

