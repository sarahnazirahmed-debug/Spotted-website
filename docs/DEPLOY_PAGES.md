# Put the site (and the Pin Desk) on Cloudflare Pages for free

No domain is needed. Cloudflare gives a free address that ends in `pages.dev`.

1. Go to dash.cloudflare.com and sign in (a free account is fine).
2. Click **Workers & Pages**, then **Create**, then the **Pages** tab, then **Connect to Git**.
3. Pick the GitHub account, then the repository **Spotted-website**.
4. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build:cloudflare`
   - Build output directory: `out`
5. Open **Environment variables** and add (copy the values from `.env.local`; they are the public ones only, never the service_role key):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` (digits only, with the country code)
   - `NEXT_PUBLIC_INSTAGRAM_URL` (optional)
6. Click **Save and Deploy**. After a few minutes you get an address like `spotted-website.pages.dev`.
7. Open `your-address.pages.dev/admin`, log in with your email and the 6-digit code, then open **Pin Desk** on a laptop.
8. If the login code does not arrive or the page cannot reach the database, tell Claude. The Supabase "Site URL" may need the new address.
