# Spotted website: checklist (kept in plain words)

This file is for Sarah. It lists what is built, what still needs her OK, and what she must supply. It never holds a date.

## 1. The Supabase files: run each ONCE, in this order (Supabase > SQL Editor > New query > paste > Run)
Do not run `reset.sql` unless you want to wipe everything.

1. `schema.sql`
2. `admin.sql`
3. `public_site.sql`
4. `public_site_counters.sql`
5. `dashboard.sql`
6. `pindesk.sql`
7. `pindesk_codes.sql`
8. `pindesk_offers.sql`
9. `pindesk_log.sql`
10. `pindesk_complete.sql`
11. `pindesk_online.sql`
12. `pindesk_order_only.sql`
13. `applications.sql`
14. `dashboards.sql`
15. `apply_insider_form.sql`
16. `apply_reference_codes.sql`
17. `star_feedback.sql`
18. `pindesk_pin_rules.sql` (only Sarah can pin a reel; helpers edit only their own reels)

If a file was already run, running it again shows a red "already exists" message. That is harmless.

## 2. What Sarah must supply
- The domain name (buy it, then point Cloudflare at it).
- The real emails and phone: type them in `src/config/contactDetails.ts` and change `live` to `true` for each.
- The Instagram address and the WhatsApp number (Pin Desk > Website settings, or `.env.local`).
- The legal pages (Terms, Privacy policy, Confidentiality agreement), written by her lawyer.
- A decision on SMS phone codes (they cost money): until then `smsVerification` stays OFF in `src/config/features.ts`.
- The steps and fields of the Partner application form.
- Real prices, when she has them.

## 3. Words still to approve (written as drafts)
- The six "How Spotted helps" cards on the home page.
- The 14 FAQ answers and the About us story.
- The Rate us card words and the five rating notes.
- The Insider form step headings and the "We got your form" words.

## 4. Switches that are OFF on purpose (src/config/features.ts)
`careersPage`, `themeLamp`, `smsVerification`, `storeButtons`, `waitlist`, `businessWaitlist`, `insiderWaitlist`. Bring one back by changing one word.

## 5. Before the site goes public
- Switch `designDraft` OFF (it shows a small "Design draft" tag on some pages).
- Run every SQL file above, or switch off what needs it (`feedbackStar`).
- Look at the site once with Reduce Motion turned on in the computer settings.
- Check every switch in `features.ts` is set the way you want.
