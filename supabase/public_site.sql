-- SPOTTED PUBLIC SITE (Supabase / Postgres)
--
-- Run this AFTER schema.sql and admin.sql. It adds:
--   * contact_requests : the "Get in touch" forms on the Restaurants, Shops and Insiders pages
--   * removal_requests : the "Creators: remove my reels" form
--   * stats_counters + public_stats() : the live counters on the home page
--
-- The rules, in plain words (enforced by the database itself):
--   * Anyone on the internet can SEND a contact or removal request. Nobody on the website can READ them back.
--     Only the main admin and associates can read and update them (in the Supabase table editor, or later in /admin).
--   * The home page counters call public_stats(), which returns only TOTALS (a number per country). It never
--     returns any person's details.
--   * Only the main admin can change the "saves" numbers by hand (until the app fills them in).

-- Where people are from (a two-letter country code such as AE). Used only for the counters.
alter table public.profiles         add column country text check (country ~ '^[A-Z]{2}$');
alter table public.partner_accounts add column country text check (country ~ '^[A-Z]{2}$');

-- ---------------------------------------------------------------------------
-- Get in touch (Restaurants, Shops, Insiders)
-- ---------------------------------------------------------------------------
create table public.contact_requests (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('restaurant', 'shop', 'insider')),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  business    text check (char_length(business) <= 160),
  phone       text check (char_length(phone) <= 40),      -- phone or WhatsApp number
  email       text check (char_length(email) <= 254),
  created_at  timestamptz not null default now(),
  handled     boolean not null default false,
  notes       text check (char_length(notes) <= 2000),     -- your own notes
  constraint contact_needs_a_way_to_reply check (phone is not null or email is not null)
);
alter table public.contact_requests enable row level security;
revoke all on public.contact_requests from anon, authenticated;
grant insert on public.contact_requests to anon, authenticated;
grant select, update on public.contact_requests to authenticated;
create policy "anyone can get in touch" on public.contact_requests
  for insert to anon, authenticated with check (handled = false and notes is null);
create policy "main admin and associates read requests" on public.contact_requests
  for select to authenticated using (public.is_team_manager());
create policy "main admin and associates update requests" on public.contact_requests
  for update to authenticated using (public.is_team_manager()) with check (public.is_team_manager());

-- ---------------------------------------------------------------------------
-- Creators: remove my reels
-- ---------------------------------------------------------------------------
create table public.removal_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text check (char_length(name) <= 120),
  handles     text not null check (char_length(trim(handles)) between 1 and 500),   -- their @handles
  links       text check (char_length(links) <= 4000),                               -- the reel links to remove (or "all")
  email       text not null check (char_length(email) between 3 and 254),
  created_at  timestamptz not null default now(),
  handled     boolean not null default false,
  notes       text check (char_length(notes) <= 2000)
);
alter table public.removal_requests enable row level security;
revoke all on public.removal_requests from anon, authenticated;
grant insert on public.removal_requests to anon, authenticated;
grant select, update on public.removal_requests to authenticated;
create policy "anyone can ask to remove their reels" on public.removal_requests
  for insert to anon, authenticated with check (handled = false and notes is null);
create policy "main admin and associates read removal requests" on public.removal_requests
  for select to authenticated using (public.is_team_manager());
create policy "main admin and associates update removal requests" on public.removal_requests
  for update to authenticated using (public.is_team_manager()) with check (public.is_team_manager());

-- ---------------------------------------------------------------------------
-- Live counters on the home page
-- ---------------------------------------------------------------------------
-- "Saves" happen inside the app, which does not talk to this database yet. Until it does, the main admin
-- can type the numbers in here (one row per country).
create table public.stats_counters (
  metric   text not null check (metric in ('saves')),
  country  text not null check (country ~ '^[A-Z]{2}$'),
  value    bigint not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (metric, country)
);
alter table public.stats_counters enable row level security;
revoke all on public.stats_counters from anon, authenticated;
grant select, insert, update, delete on public.stats_counters to authenticated;
create policy "only the main admin manages counters" on public.stats_counters
  for all to authenticated using (public.my_team_role() = 'main_admin') with check (public.my_team_role() = 'main_admin');

-- The only thing the website can ask for: totals. country = 'ALL' means worldwide.
create function public.public_stats() returns table (metric text, country text, value bigint)
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
$$;
revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
