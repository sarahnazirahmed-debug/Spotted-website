-- SPOTTED: SPLIT "SAVES" INTO SAVED PLACES AND SAVED REELS (Supabase / Postgres)
--
-- Run this AFTER public_site.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * The home page counter bar now shows "Saved places" and "Saved reels" separately. The app does not talk to this database
--     yet, so the main admin types each number in (one row per country, in the stats_counters table).
--   * The old "saves" rows are kept, so nothing that used them breaks.
--   * The public function public_stats() now also gives the worldwide totals for the two new numbers. Totals only, as before.

alter table public.stats_counters drop constraint stats_counters_metric_check;
alter table public.stats_counters add constraint stats_counters_metric_check
  check (metric in ('saves', 'saved_places', 'saved_reels'));

create or replace function public.public_stats() returns table (metric text, country text, value bigint)
language sql stable security definer set search_path = public as $$
  select 'people'::text, p.country, count(*)::bigint from public.profiles p where p.country is not null group by p.country
  union all select 'people', 'ALL', count(*) from public.profiles
  union all select 'partners', a.country, count(*) from public.partner_accounts a
    where a.kind in ('restaurant', 'shop') and a.status in ('trial', 'active') and a.country is not null group by a.country
  union all select 'partners', 'ALL', count(*) from public.partner_accounts a
    where a.kind in ('restaurant', 'shop') and a.status in ('trial', 'active')
  union all select 'insiders', a.country, count(*) from public.partner_accounts a
    where a.kind = 'influencer' and a.status in ('trial', 'active') and a.country is not null group by a.country
  union all select 'insiders', 'ALL', count(*) from public.partner_accounts a
    where a.kind = 'influencer' and a.status in ('trial', 'active')
  union all select s.metric, s.country, s.value from public.stats_counters s
  union all select 'saves', 'ALL', coalesce(sum(s.value), 0) from public.stats_counters s where s.metric = 'saves'
  union all select 'saved_places', 'ALL', coalesce(sum(s.value), 0) from public.stats_counters s where s.metric = 'saved_places'
  union all select 'saved_reels', 'ALL', coalesce(sum(s.value), 0) from public.stats_counters s where s.metric = 'saved_reels'
$$;
revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
