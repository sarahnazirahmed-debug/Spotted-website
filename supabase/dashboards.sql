-- SPOTTED INSIDER AND PARTNER DASHBOARDS (Supabase / Postgres)
--
-- Run this AFTER applications.sql. It is a new file; the older files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * When the main admin or an associate presses APPROVE on an application, the database makes a "member"
--     for that email and starts the free period: 2 months for regular Insiders and Partners. For a Founding
--     Insider the owner types the free months for THAT person before pressing Approve.
--   * Only approved members can use a dashboard. They log in with the same email and the 6-digit code.
--   * Access stops when the free period ends and there is no payment (paid_until). Nothing is deleted:
--     the data is kept, and access comes back as soon as paid_until is in the future (or the owner extends the free period).
--   * Pressing Decline or Back to New on an approved application pauses the member (nothing is deleted).
--   * Insiders keep their reels (link, optional place name and posted-on date). Each new reel is "waiting" until
--     the team has checked it and linked the place.
--   * Partners keep their items (name and price in AED) and their offers (text, start date, end date or "always on").
--   * MONEY: the amount an Insider generated is kept in member_numbers, which only the main admin and associates can read.
--     A member only ever gets a RANGE as words (such as "10K to 50K", or "None yet") from my_numbers().
--   * Everything starts at zero.

-- ---------------------------------------------------------------------------
-- Members (approved Insiders and Partners)
-- ---------------------------------------------------------------------------
alter table public.applications add column founding_free_months integer check (founding_free_months between 1 and 36);
grant update (founding_free_months) on public.applications to authenticated;

create table public.member_access (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email)),     -- one account per email
  user_id         uuid references auth.users (id) on delete set null,   -- filled at the first log-in
  kind            text not null check (kind in ('insider', 'partner')),
  application_id  uuid references public.applications (id) on delete set null,
  founding        boolean not null default false,
  status          text not null default 'active' check (status in ('active', 'paused')),
  approved_at     timestamptz not null default now(),
  free_until      timestamptz not null,                                  -- the end of the free period
  paid_until      timestamptz                                            -- set once payment exists
);
alter table public.member_access enable row level security;
revoke all on public.member_access from anon, authenticated;
grant select on public.member_access to authenticated;
create policy "main admin and associates read members" on public.member_access
  for select to authenticated using (public.is_team_manager());

-- The numbers shown on the dashboards. Members cannot read this table (it holds money); my_numbers() gives them what they may see.
create table public.member_numbers (
  member_id             uuid primary key references public.member_access (id) on delete cascade,
  green_stars           integer not null default 0 check (green_stars >= 0),
  yellow_stars          integer not null default 0 check (yellow_stars >= 0),
  saves                 integer not null default 0 check (saves >= 0),
  amount_generated_aed  numeric(12, 2) not null default 0 check (amount_generated_aed >= 0)
);
alter table public.member_numbers enable row level security;
revoke all on public.member_numbers from anon, authenticated;
grant select, update on public.member_numbers to authenticated;
create policy "main admin and associates read numbers" on public.member_numbers
  for select to authenticated using (public.is_team_manager());
create policy "main admin and associates change numbers" on public.member_numbers
  for update to authenticated using (public.is_team_manager()) with check (public.is_team_manager());

-- ---------------------------------------------------------------------------
-- Who am I, and may I use my dashboard now?
-- ---------------------------------------------------------------------------
-- The id of MY active member row of this kind, only while my access is on (free period or paid). Otherwise null.
create function public.my_member_id(p_kind text) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.member_access m
  where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.kind = p_kind and m.status = 'active'
    and (m.free_until > now() or coalesce(m.paid_until, '-infinity'::timestamptz) > now())
  limit 1
$$;

-- The website calls this right after log-in. It links the account at the first log-in and says what kind of member you are.
create function public.my_access() returns table (kind text, access_ok boolean, free_until timestamptz, paid_until timestamptz, founding boolean)
language plpgsql security definer set search_path = public as $$
begin
  update public.member_access m set user_id = auth.uid()
  where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.user_id is null;
  return query
    select m.kind, (m.status = 'active' and (m.free_until > now() or coalesce(m.paid_until, '-infinity'::timestamptz) > now())),
           m.free_until, m.paid_until, m.founding
    from public.member_access m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.status = 'active'
    limit 1;
end $$;

-- Money as a RANGE in words. The real amount never leaves the database.
create function public.amount_range(p_amount numeric) returns text
language sql immutable as $$
  select case
    when coalesce(p_amount, 0) <= 0 then 'None yet'
    when p_amount < 1000 then 'Under 1K'
    when p_amount < 10000 then '1K to 10K'
    when p_amount < 50000 then '10K to 50K'
    when p_amount < 100000 then '50K to 100K'
    else '100K or more'
  end
$$;

-- ---------------------------------------------------------------------------
-- Approve = start access. (Runs when the status of an application changes.)
-- ---------------------------------------------------------------------------
create function public.apply_application_decision() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  existing public.member_access;
  months integer;
  new_id uuid;
begin
  if new.status = 'Approved' and old.status is distinct from 'Approved' then
    if new.join_type = 'founding' then
      months := new.founding_free_months;
      if months is null then
        raise exception 'Please type the free months for this Founding Insider before you approve.';
      end if;
    else
      months := 2;   -- the first 2 months are free for regular Insiders and Partners
    end if;
    select * into existing from public.member_access where email = new.email;
    if found then
      if existing.kind <> new.kind then
        raise exception 'This email already has a different kind of account (%).', existing.kind;
      end if;
      update public.member_access set status = 'active', application_id = new.id where id = existing.id;   -- the free period is NOT restarted
    else
      insert into public.member_access (email, kind, application_id, founding, free_until)
      values (new.email, new.kind, new.id, coalesce(new.join_type = 'founding', false), now() + make_interval(months => months))
      returning id into new_id;
      insert into public.member_numbers (member_id) values (new_id);
    end if;
  elsif old.status = 'Approved' and new.status <> 'Approved' then
    update public.member_access set status = 'paused' where application_id = new.id;   -- paused, nothing deleted
  end if;
  return new;
end $$;
create trigger applications_decision after update of status on public.applications
  for each row execute function public.apply_application_decision();

-- The owner changes the free period of one member (for example a Founding Insider). Counted from the approval day.
create function public.set_free_period(p_member uuid, p_months integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_manager() then raise exception 'Only the main admin and associates can do this.'; end if;
  if p_months is null or p_months < 0 or p_months > 36 then raise exception 'Months must be from 0 to 36.'; end if;
  update public.member_access set free_until = approved_at + make_interval(months => p_months) where id = p_member;
end $$;

-- ---------------------------------------------------------------------------
-- Insider reels (member_id is filled in by the database: it is always MY member row)
-- ---------------------------------------------------------------------------
create table public.insider_reels (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null default public.my_member_id('insider') references public.member_access (id) on delete cascade,
  url         text not null check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 500),   -- only the link, never the video, photo or caption
  place_name  text check (char_length(place_name) <= 160),                                          -- optional, typed by the Insider
  posted_on   date,                                                                                  -- optional
  status      text not null default 'waiting' check (status in ('waiting', 'checked')),            -- "Waiting for our check" until the team links the place
  created_at  timestamptz not null default now()
);
alter table public.insider_reels enable row level security;
revoke all on public.insider_reels from anon, authenticated;
grant select, insert, delete on public.insider_reels to authenticated;
grant update (status) on public.insider_reels to authenticated;
create policy "my reels: read" on public.insider_reels for select to authenticated
  using (member_id = public.my_member_id('insider') or public.is_team_member());
create policy "my reels: add" on public.insider_reels for insert to authenticated
  with check (member_id = public.my_member_id('insider') and status = 'waiting');
create policy "my reels: remove" on public.insider_reels for delete to authenticated
  using (member_id = public.my_member_id('insider'));
create policy "team checks reels" on public.insider_reels for update to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

-- ---------------------------------------------------------------------------
-- Partner items and offers
-- ---------------------------------------------------------------------------
create table public.partner_items (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null default public.my_member_id('partner') references public.member_access (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  price_aed   numeric(10, 2) not null check (price_aed >= 0 and price_aed <= 100000),
  created_at  timestamptz not null default now()
);
create table public.partner_offers (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null default public.my_member_id('partner') references public.member_access (id) on delete cascade,
  text        text not null check (char_length(btrim(text)) between 1 and 300),
  starts_on   date not null,
  ends_on     date,
  always_on   boolean not null default false,                                       -- "No end date (always on)"
  created_at  timestamptz not null default now(),
  constraint offer_has_an_end_or_is_always_on check ((always_on and ends_on is null) or (not always_on and ends_on is not null and ends_on >= starts_on))
);
alter table public.partner_items enable row level security;
alter table public.partner_offers enable row level security;
revoke all on public.partner_items, public.partner_offers from anon, authenticated;
grant select, insert, delete on public.partner_items, public.partner_offers to authenticated;
create policy "my items" on public.partner_items for all to authenticated
  using (member_id = public.my_member_id('partner'))
  with check (member_id = public.my_member_id('partner'));
create policy "team reads items" on public.partner_items for select to authenticated using (public.is_team_member());
create policy "my offers" on public.partner_offers for all to authenticated
  using (member_id = public.my_member_id('partner'))
  with check (member_id = public.my_member_id('partner'));
create policy "team reads offers" on public.partner_offers for select to authenticated using (public.is_team_member());

-- ---------------------------------------------------------------------------
-- The five numbers on each dashboard (money only as a range)
-- ---------------------------------------------------------------------------
create function public.my_numbers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  m public.member_access;
  n public.member_numbers;
begin
  select * into m from public.member_access
  where email = lower(coalesce(auth.jwt() ->> 'email', '')) and status = 'active'
    and (free_until > now() or coalesce(paid_until, '-infinity'::timestamptz) > now());
  if not found then return null; end if;
  select * into n from public.member_numbers where member_id = m.id;
  if m.kind = 'insider' then
    return jsonb_build_object(
      'kind', 'insider', 'green_stars', coalesce(n.green_stars, 0), 'yellow_stars', coalesce(n.yellow_stars, 0), 'saves', coalesce(n.saves, 0),
      'reels_added', (select count(*) from public.insider_reels r where r.member_id = m.id),
      'amount_range', public.amount_range(n.amount_generated_aed),
      'paid_until', m.paid_until);
  end if;
  return jsonb_build_object(
    'kind', 'partner', 'green_stars', coalesce(n.green_stars, 0), 'yellow_stars', coalesce(n.yellow_stars, 0), 'saves', coalesce(n.saves, 0),
    'items', (select count(*) from public.partner_items i where i.member_id = m.id),
    'offers_live', (select count(*) from public.partner_offers o where o.member_id = m.id and o.starts_on <= current_date and (o.always_on or o.ends_on >= current_date)),
    'paid_until', m.paid_until);
end $$;

revoke all on function public.my_member_id(text), public.my_access(), public.my_numbers(), public.set_free_period(uuid, integer),
  public.apply_application_decision() from public, anon;
grant execute on function public.my_member_id(text), public.my_access(), public.my_numbers(), public.set_free_period(uuid, integer) to authenticated;
grant execute on function public.amount_range(numeric) to authenticated;
