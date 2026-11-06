# Spotted website: site rules

These rules are for the Spotted website (this folder). Follow them in every step. If a request clashes with a rule, say so before building. A test (`tests/site-rules.test.mjs`) checks the rules that can be checked by a computer.

## 1. Colours

- **Every colour lives in ONE file: `src/styles/colors.css`**, as a named colour. Components use the names (for example `bg-page`, `text-heading`, `bg-panel`, or `var(--c-accent)` in a drawing). **Never write a colour code** (`#...`, `rgb(...)`, `hsl(...)`) anywhere else. To change the look, change that one file.
- The brand colours are **not decided yet**. The file holds neutral placeholders: soft white, charcoal, and one warm accent (ember).
- Special names inside that file: green (`--leaf`) is **only** for green stars and growth. WhatsApp green (`--whatsapp`) is **only** on the WhatsApp button.
- Code that cannot use CSS names (the 3D banner, the day and night mixing) reads the colours from the page through `src/styles/palette.ts`. It never holds colour codes of its own.
- Small text is dark on light and light on dark. Check contrast in both themes.

## 2. Fonts

- **Two fonts, in ONE file: `src/styles/fonts.ts`** (a heading font and a body font). Change them there and nowhere else. They become `--font-heading` and `--font-body`.
- Today both are Poppins (500, 700, 800) as a placeholder until the brand is decided.

## 3. Words and dates

- **No launch dates anywhere on the site.** Not on the banner, the stories, the sign-up note or `features.ts`. Say **"Coming soon"** only.
- English only for now, **but ready for more languages** (Arabic next):
  - keep words in ONE text file: `src/content/en.ts` (the public pages read it through `src/content/index.ts`; to add a language, copy `en.ts` and translate it). Prices and plan lines are in `src/config/pricing.ts`;
  - never put long sentences inside the page code (a test checks the main pages);
  - never put words inside pictures (the 3D banner words come from the page);
  - leave room for longer words, and for right-to-left writing (use `start`/`end` and `ms-`/`me-` in new CSS, not left and right where it can be avoided);
  - keep `lang` on the page's `<html>` tag.

## 4. Drawings: never draw people

- Never draw people, faces, eyes, hands or any human figure (no heads, no headscarves on a body, no arms, no silhouettes).
- Draw things instead: pins, phones, roads, cafes, plates, bags, stars, cars without a driver, bookmarks.
- Avoid round shapes that look like eyes (paired headlights, paired windows, a phone camera dot).

## 5. No real social logos, and no copying

- No real Instagram or TikTok logos or look-alikes. Use generic icons (a play triangle in a rounded square, a heart, a bookmark). The WhatsApp button is the only brand icon allowed.
- **Store only reel links and place facts** (name, area, category, opening details, offers the place gives us). **Never copy or scrape videos, photos or captions** from Instagram, TikTok or YouTube. Photos and videos on the site come from the place itself or the creator, with permission.

## 6. Spotted Insider (creators)

- **Spotted Insider is paid only**: AED 249 a month, first 2 months free. There is **no free creator plan** on the website and no "Free vs Pro" table.
- **Creators who do not pay get nothing shown on the site.** No creator names, handles, credit or stars are shown to the public. The switch `creatorCredit` in `features.ts` is OFF and hides the Influencer story, creator handles on place pages and the star row in the simple version.
- The three stars (yellow = someone saved your reel's place, purple = visited but did not order, green = visited and ordered) are explained only on the Insider page, with clearly labelled EXAMPLE numbers.

## 7. Light and dark theme on every page

- Every page and every section works in light and dark.
- Colours come from the theme names in `src/styles/colors.css` and change with the theme (the lamp switches it, and the choice is remembered).

## 8. Mobile first

- Design for a small phone first, then widen for tablet and desktop.
- Tap targets at least 44 x 44.
- No sideways scrolling. Respect the iPhone safe areas.

## 9. Animation needs a still fallback

- Every animation must have a still version (a plain picture, no movement) for slow phones and for people who turned on Reduce Motion.
- The still version shows the same message as the animated one.
- Never make the animation the only way to read something.

## 10. Every big section has an on/off switch

- Every big section of the site can be switched on or off from `src/config/features.ts`.
- One true/false word per section. Never delete a hidden section; to bring it back, change its switch.
- Before the site goes public, check every switch is set the way you want.

## 11. The /admin area (team only)

- `/admin` is for the team (Pin Desk and Team). It is never linked from the public site, search engines are told not to list it, and it has its own switch (`adminArea`).
- Log in with an email and a 6-digit code **every time** (the log-in is kept only in memory, never saved).
- The **database** decides who may see and do what (`supabase/admin.sql`, with row-level security). The website only decides which buttons to show. Tests for both are in `tests/admin-database.test.mjs` and `tests/admin-helpers.test.mjs`.
- Exactly one main admin. Nobody can change or remove it.
- `/admin/dashboard` is for the main admin and associates (everything) and staff (counts only: **never money**). Helpers do not see it. Money cards are marked `money: true` in `src/lib/dashboard/cards.ts`. Numbers with no real source yet are always labelled EXAMPLE on the page and in the Excel and PDF files.
- The Pin Desk stores only reel links and place facts. Nothing about app users. The creator handle is for the team only and is never shown to app users or the public.

## 12. The public pages (business website)

- Top menu, in this order: Home, Restaurants, Shops, Insiders, Pricing, How to join, FAQ, About, Sign in. Careers is built but OFF.
- The animated home (cloth banner, stories) and the pull-string lamp are built but OFF (`hero`, `themeLamp` in `features.ts`).
- Prices and "what is included" are in ONE file: `src/config/pricing.ts`. The first 2 months are free; paying yearly gives 1 month free.
- The live counters (People on Spotted, Saves, Spotted Partners, Spotted Insiders) show for the visitor's country and worldwide, but each one only after it passes its number in `src/config/counters.ts`. They show totals only, never any person's details.
- The App Store and Google Play buttons show only when `storeButtons` is ON and the links are filled in.
- Restaurants, Shops and Insiders say "Coming soon" and have a "Get in touch" form that saves to Supabase. There is no sign-up yet.
- WhatsApp and Instagram buttons use words and a plain arrow, never the real logos. The Instagram link comes from `NEXT_PUBLIC_INSTAGRAM_URL`.
