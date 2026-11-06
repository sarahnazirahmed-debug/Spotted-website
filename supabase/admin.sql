-- SPOTTED ADMIN AREA (Supabase / Postgres)
--
-- Run this AFTER schema.sql (schema.sql is the first setup; this one adds the team and the Pin Desk).
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
-- Then do the last step at the bottom ("MAKE YOURSELF THE MAIN ADMIN").
--
-- THE RULES, in plain words (they are enforced by the database itself, not only by the website):
--   * Row-level security is ON for every table here. With it on, nobody can read or change a row unless a
--     "policy" below says so. Logged-out visitors and people who are not on the team get NOTHING.
--   * Four roles: main_admin, associate, staff, helper. There is EXACTLY ONE main_admin, and nobody can
--     change or remove it (a lock inside the database stops it, even for the SQL Editor).
--   * main_admin, associate, staff and helper can use reels and share_requests.
--   * Only the main_admin adds or removes associates. The main_admin and associates add or remove staff and helpers.
--   * Only the main_admin and associates can read the team list, the team log and (later) earnings.
--   * App users never read reels directly. Only team members can.
--   * Every add / remove / change of a team member is written to team_log automatically.

-- ---------------------------------------------------------------------------
-- Who is on the team
-- ---------------------------------------------------------------------------
create type team_role as enum ('main_admin', 'associate', 'staff', 'helper');

create table public.team_members (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid references auth.users (id) on delete set null,  -- filled at the first log-in
  email                      text not null check (email = lower(email) and char_length(email) <= 254),
  name                       text not null default '' check (char_length(name) <= 120),
  role                       team_role not null,
  added_by                   text,                       -- name or email of who added them (text, so it survives removal)
  added_at                   timestamptz not null default now(),
  agreed_confidentiality_at  timestamptz,                -- when they ticked the confidentiality box
  active                     boolean not null default true
);
create unique index team_members_email_key on public.team_members (email);
-- EXACTLY ONE main admin: a second one is refused by the database.
create unique index team_one_main_admin on public.team_members (role) where role = 'main_admin';

-- ---------------------------------------------------------------------------
-- Helper functions: who is the person logged in, and what role do they have?
-- They read the email from the log-in (verified by the 6-digit code).
-- ---------------------------------------------------------------------------
create function public.my_team_role() returns team_role
language sql stable security definer set search_path = public as $$
  select m.role from public.team_members m
  where m.active and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create function public.my_team_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(m.name, ''), m.email) from public.team_members m
  where m.active and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create function public.is_team_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_team_role() is not null
$$;

create function public.is_team_manager() returns boolean   -- main_admin or associate
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_team_role() in ('main_admin', 'associate'), false)
$$;

-- The website calls this right after log-in: it links the account to the team row and says who you are.
create function public.whoami() returns table (role team_role, name text, email text, agreed_confidentiality_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  update public.team_members m set user_id = auth.uid()
  where m.active and m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.user_id is null;
  return query
    select m.role, m.name, m.email, m.agreed_confidentiality_at from public.team_members m
    where m.active and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    limit 1;
end $$;

-- The "I agree to keep this confidential" tick box.
create function public.agree_confidentiality() returns void
language sql security definer set search_path = public as $$
  update public.team_members m set agreed_confidentiality_at = coalesce(m.agreed_confidentiality_at, now())
  where m.active and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- ---------------------------------------------------------------------------
-- The team log (written automatically, never by hand)
-- ---------------------------------------------------------------------------
create table public.team_log (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  actor_email   text,
  actor_name    text,
  action        text not null check (action in ('added', 'removed', 'changed')),
  target_email  text not null,
  target_name   text,
  detail        text
);

-- ---------------------------------------------------------------------------
-- Locks on team_members
-- ---------------------------------------------------------------------------
-- 1) The main admin cannot be changed or removed. Nobody else can become main admin.
create function public.protect_main_admin() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'main_admin' then
      raise exception 'The main admin cannot be removed.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if new.role = 'main_admin' and old.role <> 'main_admin' then
      raise exception 'Nobody can be made the main admin.' using errcode = 'P0001';
    end if;
    if old.role = 'main_admin' and (
         new.role is distinct from old.role or new.email is distinct from old.email
         or new.name is distinct from old.name or new.active is distinct from old.active
         or new.added_by is distinct from old.added_by or new.added_at is distinct from old.added_at) then
      raise exception 'The main admin cannot be changed.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger team_protect_main_admin before update or delete on public.team_members
  for each row execute function public.protect_main_admin();

-- 2) When a person adds someone, the database fills in who added them and when (so it cannot be faked).
create function public.stamp_team_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then   -- an app / website user (not the SQL Editor)
    new.added_by := coalesce(public.my_team_name(), lower(coalesce(auth.jwt() ->> 'email', '')));
    new.added_at := now();
    new.user_id := null;
    new.agreed_confidentiality_at := null;
    new.active := true;
  end if;
  new.email := lower(trim(new.email));
  return new;
end $$;
create trigger team_stamp before insert on public.team_members
  for each row execute function public.stamp_team_member();

-- 3) Write to the log.
create function public.log_team_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  who_name  text := public.my_team_name();
begin
  if who_email = '' then who_email := 'SQL Editor'; end if;
  if tg_op = 'INSERT' then
    insert into public.team_log (actor_email, actor_name, action, target_email, target_name, detail)
    values (who_email, who_name, 'added', new.email, new.name, 'role: ' || new.role);
  elsif tg_op = 'DELETE' then
    insert into public.team_log (actor_email, actor_name, action, target_email, target_name, detail)
    values (who_email, who_name, 'removed', old.email, old.name, 'role was: ' || old.role);
  elsif new.role is distinct from old.role or new.name is distinct from old.name or new.active is distinct from old.active then
    insert into public.team_log (actor_email, actor_name, action, target_email, target_name, detail)
    values (who_email, who_name, 'changed', new.email, new.name,
            concat_ws('; ',
              case when new.role is distinct from old.role then 'role: ' || old.role || ' to ' || new.role end,
              case when new.name is distinct from old.name then 'name: ' || old.name || ' to ' || new.name end,
              case when new.active is distinct from old.active then 'active: ' || old.active || ' to ' || new.active end));
  end if;
  return null;
end $$;
create trigger team_log_changes after insert or update or delete on public.team_members
  for each row execute function public.log_team_change();

-- ---------------------------------------------------------------------------
-- Privacy rules for team_members and team_log
-- ---------------------------------------------------------------------------
alter table public.team_members enable row level security;
alter table public.team_log enable row level security;
revoke all on public.team_members, public.team_log from anon;
revoke insert, update, delete on public.team_log from authenticated;

create policy "main admin and associates read the team" on public.team_members
  for select to authenticated using (public.is_team_manager());

-- Add: the main admin adds associates, staff and helpers. Associates add staff and helpers only.
create policy "add people (by role)" on public.team_members
  for insert to authenticated with check (
    (public.my_team_role() = 'main_admin' and role in ('associate', 'staff', 'helper'))
    or (public.my_team_role() = 'associate' and role in ('staff', 'helper'))
  );

-- Change: same limits. The main admin row can never be touched.
create policy "change people (by role)" on public.team_members
  for update to authenticated
  using (
    (public.my_team_role() = 'main_admin' and role in ('associate', 'staff', 'helper'))
    or (public.my_team_role() = 'associate' and role in ('staff', 'helper'))
  )
  with check (
    (public.my_team_role() = 'main_admin' and role in ('associate', 'staff', 'helper'))
    or (public.my_team_role() = 'associate' and role in ('staff', 'helper'))
  );

-- Remove: same limits.
create policy "remove people (by role)" on public.team_members
  for delete to authenticated using (
    (public.my_team_role() = 'main_admin' and role in ('associate', 'staff', 'helper'))
    or (public.my_team_role() = 'associate' and role in ('staff', 'helper'))
  );

create policy "main admin and associates read the log" on public.team_log
  for select to authenticated using (public.is_team_manager());

-- ---------------------------------------------------------------------------
-- REELS: the Pin Desk. Only links and place facts. Nothing about app users.
-- ---------------------------------------------------------------------------
-- up to 9 dishes: [{"name": "Saffron rice", "price_aed": 38}, ...]
create function public.reel_dishes_ok(d jsonb) returns boolean
language plpgsql immutable as $$
declare
  item jsonb;
begin
  if jsonb_typeof(d) <> 'array' or jsonb_array_length(d) > 9 then return false; end if;
  for item in select * from jsonb_array_elements(d) loop
    -- "is distinct from" (not "<>") so that a missing name or price counts as wrong, not as "unknown"
    if jsonb_typeof(item) is distinct from 'object'
       or jsonb_typeof(item -> 'name') is distinct from 'string' or char_length(item ->> 'name') = 0
       or jsonb_typeof(item -> 'price_aed') is distinct from 'number' or (item ->> 'price_aed')::numeric < 0 then
      return false;
    end if;
  end loop;
  return true;
end $$;

create table public.reels (
  id              uuid primary key default gen_random_uuid(),
  url             text not null check (url ~* '^https://'),                -- the cleaned link
  link_key        text not null unique check (link_key ~ '^(instagram|tiktok|youtube)/[A-Za-z0-9._-]+$'),  -- instagram/ABC, tiktok/123, youtube/abc
  platform        text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  place_name      text,
  branch          text,
  emirate         text,
  country         text not null default 'UAE',
  category        text check (category in ('Eat', 'Shop', 'Play')),
  collection      text,
  maps_url        text check (maps_url is null or maps_url ~* '^https://'),
  lat             double precision check (lat between -90 and 90),
  lng             double precision check (lng between -180 and 180),
  creator_handle  text,                                                    -- hidden from app users (they never read this table)
  dishes          jsonb not null default '[]'::jsonb check (public.reel_dishes_ok(dishes)),
  offer_text      text,
  offer_start     date,
  offer_end       date,
  offer_hours     text,
  notes           text,
  status          text not null default 'to_check' check (status in ('to_check', 'pinned', 'skip')),
  added_by        text,
  pinned_by       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A reel cannot be marked Pinned without a place name and a pin on the map.
  constraint pinned_needs_place_and_pin check (
    status <> 'pinned' or (nullif(trim(place_name), '') is not null and lat is not null and lng is not null)
  ),
  constraint offer_dates_in_order check (offer_start is null or offer_end is null or offer_end >= offer_start)
);
create index reels_status_idx on public.reels (status, created_at desc);

-- The database fills in added_by, pinned_by and updated_at itself, so they cannot be faked.
create function public.stamp_reel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.added_by := coalesce(public.my_team_name(), lower(coalesce(auth.jwt() ->> 'email', '')));
      new.pinned_by := null;
      new.created_at := now();
    end if;
    if new.status = 'pinned' and new.pinned_by is null then new.pinned_by := coalesce(public.my_team_name(), new.added_by); end if;
  else
    if auth.uid() is not null then
      new.added_by := old.added_by;
      new.created_at := old.created_at;
    end if;
    if new.status = 'pinned' and old.status is distinct from 'pinned' then
      new.pinned_by := coalesce(public.my_team_name(), lower(coalesce(auth.jwt() ->> 'email', '')));
    elsif new.status <> 'pinned' then
      new.pinned_by := null;
    elsif auth.uid() is not null then
      new.pinned_by := old.pinned_by;
    end if;
  end if;
  return new;
end $$;
create trigger reels_stamp before insert or update on public.reels
  for each row execute function public.stamp_reel();

alter table public.reels enable row level security;
revoke all on public.reels from anon;
create policy "team reads reels" on public.reels for select to authenticated using (public.is_team_member());
create policy "team adds reels" on public.reels for insert to authenticated with check (public.is_team_member());
create policy "team changes reels" on public.reels for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy "main admin and associates delete reels" on public.reels for delete to authenticated
  using (public.is_team_manager());

-- ---------------------------------------------------------------------------
-- SHARE REQUESTS: what app users shared (the app fills this in later, with record_share below)
-- ---------------------------------------------------------------------------
create table public.share_requests (
  link_key         text primary key check (link_key ~ '^(instagram|tiktok|youtube)/[A-Za-z0-9._-]+$'),
  url              text not null check (url ~* '^https://'),
  platform         text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  times_shared     integer not null default 1 check (times_shared >= 1),
  first_shared_at  timestamptz not null default now(),
  last_shared_at   timestamptz not null default now()
);
alter table public.share_requests enable row level security;
revoke all on public.share_requests from anon;
create policy "team reads share requests" on public.share_requests for select to authenticated using (public.is_team_member());
create policy "team adds share requests" on public.share_requests for insert to authenticated with check (public.is_team_member());
create policy "team changes share requests" on public.share_requests for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());
create policy "main admin and associates delete share requests" on public.share_requests for delete to authenticated
  using (public.is_team_manager());

-- The app will call this when someone shares a reel. It only counts; it never lets the app read anything back.
create function public.record_share(p_link_key text, p_url text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in.'; end if;
  insert into public.share_requests (link_key, url, platform) values (p_link_key, p_url, p_platform)
  on conflict (link_key) do update set times_shared = public.share_requests.times_shared + 1, last_shared_at = now();
end $$;
revoke all on function public.record_share(text, text, text) from public, anon;
grant execute on function public.record_share(text, text, text) to authenticated;

-- "Waiting": shared by app users but not pinned yet, most-shared first. It follows the privacy rules of the person asking.
create view public.waiting_requests with (security_invoker = true) as
  select s.* from public.share_requests s
  where not exists (select 1 from public.reels r where r.link_key = s.link_key and r.status = 'pinned')
  order by s.times_shared desc, s.last_shared_at desc;
revoke all on public.waiting_requests from anon;

-- ---------------------------------------------------------------------------
-- EARNINGS (later): only the main admin and associates can read them
-- ---------------------------------------------------------------------------
create table public.earnings (
  id            uuid primary key default gen_random_uuid(),
  reel_id       uuid references public.reels (id) on delete set null,
  member_email  text not null,
  amount_aed    numeric(10, 2) not null check (amount_aed >= 0),
  note          text,
  created_at    timestamptz not null default now()
);
alter table public.earnings enable row level security;
revoke all on public.earnings from anon;
create policy "main admin and associates read earnings" on public.earnings
  for select to authenticated using (public.is_team_manager());
create policy "only the main admin writes earnings" on public.earnings
  for all to authenticated using (public.my_team_role() = 'main_admin') with check (public.my_team_role() = 'main_admin');

-- ---------------------------------------------------------------------------
-- Functions that the website may call
-- ---------------------------------------------------------------------------
revoke all on function public.my_team_role(), public.my_team_name(), public.is_team_member(), public.is_team_manager(),
  public.whoami(), public.agree_confidentiality() from public, anon;
grant execute on function public.my_team_role(), public.my_team_name(), public.is_team_member(), public.is_team_manager(),
  public.whoami(), public.agree_confidentiality() to authenticated;

-- ---------------------------------------------------------------------------
-- LAST STEP: MAKE YOURSELF THE MAIN ADMIN (run this ONE line yourself, with your own email).
-- Do not paste it before you replace the email. It can only be done once: there is only one main admin.
--
--   insert into public.team_members (email, name, role) values ('YOUR-EMAIL-HERE', 'Your name', 'main_admin');
-- ---------------------------------------------------------------------------
