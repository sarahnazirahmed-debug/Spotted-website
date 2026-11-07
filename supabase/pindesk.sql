-- SPOTTED PIN DESK: restaurants and shops, locations, and what is on each reel (Supabase / Postgres)
--
-- Run this AFTER schema.sql, admin.sql, public_site.sql and dashboard.sql.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- THE RULES, in plain words (the database enforces them, not only the website):
--   * Same security pattern as admin.sql. Row-level security is ON for every new table. Only logged-in
--     TEAM MEMBERS (main admin, associate, staff, helper) can read or write. Logged-out visitors and people
--     who are not on the team get nothing.
--   * Everyone on the team can add and change. Only the main admin and associates can delete.
--   * "Added by" and the dates are filled in by the database from the person's log-in. They cannot be faked
--     and they cannot be changed later.
--   * Every code is unique (compared without caring about capital letters). If you leave the code empty,
--     the database makes one (BUS-000001, LOC-000001, REEL-000001 ...). A code never changes.
--
-- NOTE: the old table "offers" (for paying partners, in schema.sql) already exists, so the Pin Desk's reel
-- offers table is called reel_offers.
--
-- TO UNDO (only if you ever need to): see the commented block at the very bottom.

-- ---------------------------------------------------------------------------
-- Code numbers (used when a code is left empty)
-- ---------------------------------------------------------------------------
create sequence public.business_code_seq;
create sequence public.location_code_seq;
create sequence public.reel_code_seq;

-- ---------------------------------------------------------------------------
-- 1. Restaurants and shops
-- ---------------------------------------------------------------------------
-- not_needed says which details are marked "Not needed" (so they do not count as missing), for example
-- {"instagram_handle": true, "business_whatsapp": true}. Allowed names: subtype, instagram_handle,
-- business_email, business_whatsapp. A detail marked "Not needed" must be empty.
create function public.business_not_needed_ok(j jsonb) returns boolean
language plpgsql immutable as $$
declare
  k text;
begin
  if jsonb_typeof(j) is distinct from 'object' then return false; end if;
  for k in select jsonb_object_keys(j) loop
    if k not in ('subtype', 'instagram_handle', 'business_email', 'business_whatsapp') then return false; end if;
    if jsonb_typeof(j -> k) is distinct from 'boolean' then return false; end if;
  end loop;
  return true;
end $$;

create table public.businesses (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$'),
  name               text not null check (char_length(trim(name)) between 1 and 160),
  type               text not null check (type in ('restaurant', 'shop')),
  subtype            text check (char_length(subtype) <= 80),                       -- for example cafe, bakery, fashion
  instagram_handle   text check (instagram_handle ~ '^[a-z0-9._]{1,30}$'),           -- stored without the @, in small letters
  business_email     text check (business_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(business_email) <= 254),
  business_whatsapp  text check (business_whatsapp ~ '^\+?[0-9 ()-]{7,20}$'),
  permanently_closed boolean not null default false,
  not_needed         jsonb not null default '{}'::jsonb check (public.business_not_needed_ok(not_needed)),
  added_by           text,
  created_at         timestamptz not null default now(),
  constraint not_needed_means_empty check (
    not ((not_needed ->> 'subtype') is not distinct from 'true' and subtype is not null)
    and not ((not_needed ->> 'instagram_handle') is not distinct from 'true' and instagram_handle is not null)
    and not ((not_needed ->> 'business_email') is not distinct from 'true' and business_email is not null)
    and not ((not_needed ->> 'business_whatsapp') is not distinct from 'true' and business_whatsapp is not null)
  )
);
create unique index businesses_code_key on public.businesses (lower(code));

-- ---------------------------------------------------------------------------
-- 2. Locations (a place on the map). A restaurant or shop is optional.
-- ---------------------------------------------------------------------------
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$'),
  name        text not null check (char_length(trim(name)) between 1 and 160),
  maps_url    text check (maps_url is null or maps_url ~* '^https://'),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  emirate     text check (char_length(emirate) <= 80),
  is_building boolean not null default false,          -- a mall or a hotel: it can list the places inside it
  business_id uuid references public.businesses (id) on delete set null,
  added_by    text,
  created_at  timestamptz not null default now(),
  constraint pin_has_both_numbers check ((lat is null) = (lng is null))
);
create unique index locations_code_key on public.locations (lower(code));
create index locations_business_idx on public.locations (business_id);

-- ---------------------------------------------------------------------------
-- 3. Places inside a building (a mall or a hotel): up to 500 per building
-- ---------------------------------------------------------------------------
create table public.building_places (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 160),
  added_by    text,
  created_at  timestamptz not null default now()
);
create unique index building_places_name_key on public.building_places (location_id, lower(name));

-- ---------------------------------------------------------------------------
-- 4. Reels: new columns (the old reels columns and rules stay as they are)
-- ---------------------------------------------------------------------------
alter table public.reels
  add column code        text,
  add column business_id uuid references public.businesses (id) on delete set null,
  add column location_id uuid references public.locations (id) on delete set null,
  add column posted_on   date check (posted_on >= date '2010-01-01');
-- any reel that already exists gets a code too
update public.reels set code = 'REEL-' || lpad(nextval('public.reel_code_seq')::text, 6, '0') where code is null;
alter table public.reels alter column code set not null;
alter table public.reels add constraint reels_code_format check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$');
create unique index reels_code_key on public.reels (lower(code));
create index reels_business_idx on public.reels (business_id);
create index reels_location_idx on public.reels (location_id);

-- ---------------------------------------------------------------------------
-- 5. What is on a reel: items, deals (with prices for groups), offers
-- ---------------------------------------------------------------------------
create table public.reel_items (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references public.reels (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 160),
  price_aed  numeric(10, 2) not null check (price_aed >= 0),
  added_by   text,
  created_at timestamptz not null default now()
);
create index reel_items_reel_idx on public.reel_items (reel_id);

create table public.reel_deals (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references public.reels (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 160),
  included   text check (char_length(included) <= 2000),     -- what the deal includes
  conditions text check (char_length(conditions) <= 2000),
  end_date   date,                                           -- optional
  added_by   text,
  created_at timestamptz not null default now()
);
create index reel_deals_reel_idx on public.reel_deals (reel_id);

-- the total price of a deal for a group size: for example 2 people = AED 120, 4 people = AED 220
create table public.reel_deal_prices (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid not null references public.reel_deals (id) on delete cascade,
  people          integer not null check (people between 1 and 100),
  total_price_aed numeric(10, 2) not null check (total_price_aed >= 0),
  added_by        text,
  created_at      timestamptz not null default now(),
  unique (deal_id, people)
);

create table public.reel_offers (
  id         uuid primary key default gen_random_uuid(),
  reel_id    uuid not null references public.reels (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 160),
  discount   text check (char_length(discount) <= 200),      -- for example "20% off" or "Free dessert"
  conditions text check (char_length(conditions) <= 2000),
  end_date   date,                                           -- optional
  added_by   text,
  created_at timestamptz not null default now()
);
create index reel_offers_reel_idx on public.reel_offers (reel_id);

-- ---------------------------------------------------------------------------
-- Triggers: the database fills in the code, "added by" and the dates, and keeps them fixed
-- ---------------------------------------------------------------------------
-- A code: if empty, make one. It can never change afterwards. (Used by businesses, locations and reels.)
create function public.pindesk_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  prefix text := tg_argv[0];
  seq    text := tg_argv[1];
begin
  if tg_op = 'INSERT' then
    if new.code is null or trim(new.code) = '' then
      new.code := prefix || '-' || lpad(nextval(seq::regclass)::text, 6, '0');
    else
      new.code := trim(new.code);
    end if;
  else
    new.code := old.code;
  end if;
  return new;
end $$;
create trigger businesses_code before insert or update on public.businesses
  for each row execute function public.pindesk_code('BUS', 'public.business_code_seq');
create trigger locations_code before insert or update on public.locations
  for each row execute function public.pindesk_code('LOC', 'public.location_code_seq');
create trigger reels_code before insert or update on public.reels
  for each row execute function public.pindesk_code('REEL', 'public.reel_code_seq');

-- "Added by" and the date come from the log-in. (The reels table already does this with its own trigger.)
create function public.pindesk_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then   -- a website user (not the SQL Editor)
    if tg_op = 'INSERT' then
      new.added_by := coalesce(public.my_team_name(), lower(coalesce(auth.jwt() ->> 'email', '')));
      new.created_at := now();
    else
      new.added_by := old.added_by;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end $$;
create trigger businesses_stamp before insert or update on public.businesses for each row execute function public.pindesk_stamp();
create trigger locations_stamp before insert or update on public.locations for each row execute function public.pindesk_stamp();
create trigger building_places_stamp before insert or update on public.building_places for each row execute function public.pindesk_stamp();
create trigger reel_items_stamp before insert or update on public.reel_items for each row execute function public.pindesk_stamp();
create trigger reel_deals_stamp before insert or update on public.reel_deals for each row execute function public.pindesk_stamp();
create trigger reel_deal_prices_stamp before insert or update on public.reel_deal_prices for each row execute function public.pindesk_stamp();
create trigger reel_offers_stamp before insert or update on public.reel_offers for each row execute function public.pindesk_stamp();

-- Tidy the details: Instagram without the @ and in small letters, email in small letters, empty becomes nothing.
create function public.business_tidy() returns trigger
language plpgsql as $$
begin
  new.name := trim(new.name);
  new.subtype := nullif(trim(new.subtype), '');
  new.instagram_handle := nullif(lower(regexp_replace(trim(coalesce(new.instagram_handle, '')), '^@+', '')), '');
  new.business_email := nullif(lower(trim(coalesce(new.business_email, ''))), '');
  new.business_whatsapp := nullif(trim(coalesce(new.business_whatsapp, '')), '');
  return new;
end $$;
create trigger businesses_tidy before insert or update on public.businesses
  for each row execute function public.business_tidy();

-- Places inside a building: only for mall or hotel locations, and at most 500 per building.
create function public.building_places_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_b boolean;
  n integer;
begin
  select l.is_building into is_b from public.locations l where l.id = new.location_id for update;  -- one at a time, so the count is right
  if is_b is distinct from true then
    raise exception 'Only a mall or hotel location can list places inside it.' using errcode = 'P0001';
  end if;
  select count(*) into n from public.building_places b where b.location_id = new.location_id;
  if tg_op = 'INSERT' and n >= 500 then
    raise exception 'A building can list at most 500 places.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger building_places_limit before insert or update of location_id on public.building_places
  for each row execute function public.building_places_rules();

-- A location that stops being a mall or hotel must not still have places listed inside it.
create function public.location_building_flag() returns trigger
language plpgsql as $$
begin
  if old.is_building and not new.is_building and exists (select 1 from public.building_places b where b.location_id = new.id) then
    raise exception 'Remove the places inside this building first.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger locations_building_flag before update of is_building on public.locations
  for each row execute function public.location_building_flag();

-- Reel checks: the location must belong to the same restaurant or shop (when both are given), and a reel cannot
-- be posted in the future.
create function public.reel_links_rules() returns trigger
language plpgsql as $$
declare
  loc_business uuid;
begin
  if new.posted_on is not null and new.posted_on > current_date + 1 then
    raise exception 'A reel cannot be posted in the future.' using errcode = 'P0001';
  end if;
  if new.location_id is not null and new.business_id is not null then
    select l.business_id into loc_business from public.locations l where l.id = new.location_id;
    if loc_business is not null and loc_business <> new.business_id then
      raise exception 'That location belongs to a different restaurant or shop.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger reels_links_rules before insert or update on public.reels
  for each row execute function public.reel_links_rules();

-- ---------------------------------------------------------------------------
-- Privacy rules (the same pattern as admin.sql)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['businesses', 'locations', 'building_places', 'reel_items', 'reel_deals', 'reel_deal_prices', 'reel_offers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_team_member())', 'team reads ' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_team_member())', 'team adds ' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', 'team changes ' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_team_manager())', 'main admin and associates delete ' || t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- TO UNDO THIS FILE (do not run this unless you really want to remove the Pin Desk tables and their data):
--
--   drop table public.reel_offers, public.reel_deal_prices, public.reel_deals, public.reel_items,
--     public.building_places, public.locations, public.businesses cascade;
--   alter table public.reels drop column code, drop column business_id, drop column location_id, drop column posted_on;
--   drop function public.reel_links_rules(), public.location_building_flag(), public.building_places_rules(),
--     public.business_tidy(), public.pindesk_stamp(), public.pindesk_code(), public.business_not_needed_ok(jsonb);
--   drop sequence public.business_code_seq, public.location_code_seq, public.reel_code_seq;
-- ---------------------------------------------------------------------------
