-- RESET: removes ONLY the Spotted tables, functions and word lists made by schema.sql and admin.sql, so that
-- they can be run again from a clean start. It does not touch anything else.
-- WARNING: it deletes whatever is stored in those tables (including the team list and the Pin Desk).
-- Use it only on a new project, or when you are sure.

-- dashboard.sql (dashboard numbers)
drop function if exists public.dashboard_real(text, integer), public.dashboard_influencers();

-- public_site.sql (contact forms and live counters)
drop function if exists public.public_stats();
drop table if exists public.stats_counters, public.removal_requests, public.contact_requests cascade;
alter table if exists public.profiles drop column if exists country;
alter table if exists public.partner_accounts drop column if exists country;

-- admin.sql (the team and the Pin Desk)
drop view if exists public.waiting_requests;
drop table if exists public.earnings, public.share_requests, public.reels, public.team_log, public.team_members cascade;
drop function if exists public.record_share(text, text, text), public.reel_dishes_ok(jsonb), public.stamp_reel(),
  public.log_team_change(), public.stamp_team_member(), public.protect_main_admin(), public.agree_confidentiality(),
  public.whoami(), public.is_team_manager(), public.is_team_member(), public.my_team_name(), public.my_team_role() cascade;
drop type if exists public.team_role cascade;

-- schema.sql (accounts, places, offers, media, stars, pins, reviews, waitlist)
drop table if exists public.reviews, public.pin_ledger, public.stars, public.media, public.offers,
  public.places, public.partner_accounts, public.profiles, public.waitlist cascade;

-- dropping the function also removes the sign-up trigger that uses it
drop function if exists public.handle_new_user() cascade;
drop function if exists public.my_partner_ids() cascade;

drop type if exists public.partner_kind, public.place_kind, public.star_kind, public.media_kind cascade;
