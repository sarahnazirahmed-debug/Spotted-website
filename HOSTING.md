# Hosting the public website for free (Cloudflare)

The site is built into plain files (the `out` folder) by `npm run build:cloudflare`. Cloudflare hosts plain files for free, including for a business. (Vercel's free plan is for non-commercial use only, so we do not use it.)

## One time set up (Sarah does this in the Cloudflare website)
1. Sign in at dash.cloudflare.com (free account).
2. Workers & Pages, then Create, then connect to GitHub, pick `Spotted-website`.
3. Build command: `npm run build:cloudflare`. Deploy command: `npx wrangler deploy` (already described in `wrangler.jsonc`).
4. Under Settings, Variables, add `NEXT_PUBLIC_JOIN_URL` = the address of the dashboard site (no slash at the end). Add the other `NEXT_PUBLIC_...` values from `.env.example` if you use them. Never put secret keys here.
5. Cloudflare gives a free `...workers.dev` address. A real domain is added later, only after Sarah says OK to buy one.

## Order that is safe
- Test the branch first (Cloudflare shows a preview for a branch), then merge `step8-public-site` into `main` only when Sarah says OK.
- The dashboard (a separate project) also builds to plain files and can be hosted the same way; its address goes into `NEXT_PUBLIC_JOIN_URL`.
