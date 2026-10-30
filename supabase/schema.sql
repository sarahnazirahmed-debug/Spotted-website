-- SPOTTED DATABASE (Supabase / Postgres)
--
-- How to use: open your Supabase project, go to "SQL Editor", paste this whole file, press "Run".
-- It is safe to run once on a new, empty project.
--
-- PRIVACY RULE (row-level security, "RLS"): every table has RLS switched ON. With RLS on, nobody can
-- read or change a row unless one of the "policy" lines below says they may. In plain words:
--   * a normal user can only see and change THEIR OWN rows;
--   * a partner can only see and change rows that belong to THEIR OWN places;
--   * the public can only read places, offers, media and reviews that are published;
--   * stars, pins and the waitlist are private. The website can add to them, but only the owner
--     (or nobody, for the waitlist) can read them back.
-- Visit counts are private: stars are only readable by the creator or partner they belong to.

-- ---------------------------------------------------------------------------
-- Word lists
-- ---------------------------------------------------------------------------
create type partner_kind as enum ('restaurant', 'shop', 'influencer');
create type place_kind   as enum ('restaurant', 'shop');
create type star_kind    as enum ('yellow', 'purple', 'green');   -- saved / visited, no order / visited and ordered
create type media_kind   as enum ('video', 'image', 'menu_pdf', 'reel_link');

-- ---------------------------------------------------------------------------
-- 1. WAITLIST: anyone may add themselves. Nobody on the website can read it back.
-- ---------------------------------------------------------------------------
create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  list        text not null check (list in ('visitors', 'business', 'creators', 'careers')),
  name        text check (char_length(name) <= 120),
  email       text check (char_length(email) <= 254),
  contact     text check (char_length(contact) <= 60),   -- WhatsApp number
  details     jsonb not null default '{}'::jsonb,        -- business type, area, handles ...
  created_at  timestamptz not null default now(),
  check (email is not null or contact is not null)
);
alter table public.waitlist enable row level security;
create policy "anyone can join the waitlist" on public.waitlist
  for insert to anon, authenticated with check (true);
-- (no select policy: only you, in the Supabase dashboard, can read the list)

-- ---------------------------------------------------------------------------
-- 2. USER ACCOUNTS (normal users): one row per signed-up person, made automatically at sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 120),
  email       text,
  phone       text check (char_length(phone) <= 30),     -- phone / WhatsApp number
  birthday    date,                                       -- optional, for birthday treats
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "see my own profile"    on public.profiles for select to authenticated using (id = auth.uid());
create policy "change my own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "delete my own profile" on public.profiles for delete to authenticated using (id = auth.uid());
-- (no insert policy: the profile is created by the trigger below)

-- When someone signs up, copy the details they typed (name, phone, birthday) into their profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b date;
begin
  begin
    b := nullif(new.raw_user_meta_data ->> 'birthday', '')::date;
  exception when others then
    b := null;   -- a bad date is ignored; birthday is optional
  end;
  insert into public.profiles (id, name, email, phone, birthday)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 120),
    new.email,
    left(nullif(new.raw_user_meta_data ->> 'phone', ''), 30),
    b
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. PARTNER ACCOUNTS (restaurant / shop / influencer)
--    Partners are added by you (see the example at the bottom). A partner logs in like anyone else;
--    the website sees a row here for their account and sends them to the dashboard.
-- ---------------------------------------------------------------------------
create table public.partner_accounts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references auth.users (id) on delete cascade,
  kind           partner_kind not null,
  business_name  text not null check (char_length(business_name) <= 160),
  handle         text,                                   -- influencers: @handle
  status         text not null default 'trial' check (status in ('trial', 'active', 'paused')),
  trial_started_at timestamptz not null default now(),   -- the 2 free months; the data is kept if they continue later
  created_at     timestamptz not null default now()
);
alter table public.partner_accounts enable row level security;
create policy "see my own partner account" on public.partner_accounts
  for select to authenticated using (owner_id = auth.uid());
-- (no insert / update policy: you manage partners in the dashboard, so nobody can give themselves a plan)

-- Helper: the partner accounts that belong to the person logged in.
create function public.my_partner_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.partner_accounts where owner_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 4. PLACES
-- ---------------------------------------------------------------------------
create table public.places (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partner_accounts (id) on delete cascade,
  kind         place_kind not null,
  name         text not null check (char_length(name) <= 160),
  area         text not null,                            -- e.g. Khalifa City
  emirate      text not null,                            -- e.g. Abu Dhabi
  category     text not null,
  description  text,
  signature    text,                                     -- signature dish or item
  lat          double precision,
  lng          double precision,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.places enable row level security;
create policy "everyone reads published places" on public.places
  for select to anon, authenticated using (is_published);
create policy "partners read their own places" on public.places
  for select to authenticated using (partner_id in (select public.my_partner_ids()));
create policy "partners add their own places" on public.places
  for insert to authenticated with check (partner_id in (select public.my_partner_ids()));
create policy "partners change their own places" on public.places
  for update to authenticated using (partner_id in (select public.my_partner_ids()))
  with check (partner_id in (select public.my_partner_ids()));
create policy "partners delete their own places" on public.places
  for delete to authenticated using (partner_id in (select public.my_partner_ids()));

-- ---------------------------------------------------------------------------
-- 5. OFFERS
-- ---------------------------------------------------------------------------
create table public.offers (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places (id) on delete cascade,
  title      text not null check (char_length(title) <= 160),
  details    text,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.offers enable row level security;
create policy "everyone reads active offers of published places" on public.offers
  for select to anon, authenticated
  using (is_active and exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "partners manage offers of their places" on public.offers
  for all to authenticated
  using (exists (select 1 from public.places p where p.id = place_id and p.partner_id in (select public.my_partner_ids())))
  with check (exists (select 1 from public.places p where p.id = place_id and p.partner_id in (select public.my_partner_ids())));

-- ---------------------------------------------------------------------------
-- 6. MEDIA: videos, images, menu PDF, reel links (a reel link has the reel address in "url")
-- ---------------------------------------------------------------------------
create table public.media (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partner_accounts (id) on delete cascade,
  place_id    uuid references public.places (id) on delete cascade,
  kind        media_kind not null,
  url         text not null check (url ~* '^https://'),   -- only secure web addresses
  title       text,
  created_at  timestamptz not null default now()
);
alter table public.media enable row level security;
create policy "everyone reads media of published places" on public.media
  for select to anon, authenticated
  using (place_id is not null and exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "partners manage their own media" on public.media
  for all to authenticated
  using (partner_id in (select public.my_partner_ids()))
  with check (partner_id in (select public.my_partner_ids()));

-- ---------------------------------------------------------------------------
-- 7. STARS: yellow = saved, purple = visited but did not order, green = visited and ordered.
--    Private: only the creator / partner they belong to can read them.
-- ---------------------------------------------------------------------------
create table public.stars (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places (id) on delete cascade,
  creator_id  uuid references public.partner_accounts (id) on delete set null,  -- the influencer whose reel led here
  user_id     uuid references auth.users (id) on delete set null,
  kind        star_kind not null,
  occurred_at timestamptz not null default now()          -- the date of the star
);
create index stars_place_idx on public.stars (place_id, occurred_at);
create index stars_creator_idx on public.stars (creator_id, occurred_at);
alter table public.stars enable row level security;
create policy "creators read their own stars" on public.stars
  for select to authenticated using (creator_id in (select public.my_partner_ids()));
create policy "places read the stars at their place" on public.stars
  for select to authenticated
  using (exists (select 1 from public.places p where p.id = place_id and p.partner_id in (select public.my_partner_ids())));
create policy "a user can add their own yellow star (a save)" on public.stars
  for insert to authenticated with check (user_id = auth.uid() and kind = 'yellow');
-- (purple and green stars are added by the server only, never by a visitor)

-- ---------------------------------------------------------------------------
-- 8. PINS: a record of every bill. The Pins RULE lives in src/lib/pins.ts (tested).
-- ---------------------------------------------------------------------------
create table public.pin_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  place_id     uuid references public.places (id) on delete set null,
  bill_aed     numeric(10, 2) not null check (bill_aed >= 0),
  pins_earned  integer not null check (pins_earned >= 0),
  carry_aed    numeric(10, 2) not null check (carry_aed >= 0 and carry_aed < 15),  -- money left over after this bill
  created_at   timestamptz not null default now()
);
create index pin_ledger_user_idx on public.pin_ledger (user_id, created_at);
alter table public.pin_ledger enable row level security;
create policy "see my own pins" on public.pin_ledger for select to authenticated using (user_id = auth.uid());
-- (no insert policy: Pins are added by the server only, so nobody can give themselves Pins)

-- ---------------------------------------------------------------------------
-- 9. REVIEWS
-- ---------------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 2000),
  created_at  timestamptz not null default now(),
  unique (place_id, user_id)
);
alter table public.reviews enable row level security;
create policy "everyone reads reviews of published places" on public.reviews
  for select to anon, authenticated
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "write my own review" on public.reviews
  for insert to authenticated with check (user_id = auth.uid());
create policy "change my own review" on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete my own review" on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- EXAMPLE: make someone a partner (run this yourself, in the SQL Editor, after they have signed up).
-- Replace the email and the details. kind is 'restaurant', 'shop' or 'influencer'.
--
--   insert into public.partner_accounts (owner_id, kind, business_name)
--   select id, 'restaurant', 'Their business name' from auth.users where email = 'them@example.com';
-- ---------------------------------------------------------------------------
