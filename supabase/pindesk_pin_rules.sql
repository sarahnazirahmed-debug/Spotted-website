-- WHO MAY ADD, EDIT AND PIN A REEL (Stage 2). Safe to run again.
--   * Any signed-in team member may ADD a reel, but only as "to_check" or "skip".
--   * A team member may EDIT only the reels THEY added, only while the reel is not pinned, and may only set "to_check" or "skip".
--   * Only the primary owner (approved_staff.is_primary_owner = true: Sarah) may set a reel to "pinned", and may edit any reel.
--     Nobody else, not even Admins or Heads, until Sarah changes this file's rule herself.
--   * Delete stays as before (main admin and associates). Nobody who is not signed in can read or change reels.
-- The https:// rule and the "same link twice" rule already exist (admin.sql) and are not touched.

-- approved_staff already exists on the live database (this does nothing there); it is created here only so tests can run.
create table if not exists public.approved_staff (email text primary key);
alter table public.approved_staff add column if not exists is_primary_owner boolean not null default false;
alter table public.approved_staff enable row level security; -- no open rules: only the database functions below can look inside

-- Is the person who is signed in the primary owner?
create or replace function public.is_primary_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.is_primary_owner from public.approved_staff a
                   where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1), false)
$$;
revoke all on function public.is_primary_owner() from public, anon;
grant execute on function public.is_primary_owner() to authenticated;

-- The name stamped on reels I add (the same rule stamp_reel() uses).
create or replace function public.my_reel_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_team_name(), lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke all on function public.my_reel_name() from public, anon;
grant execute on function public.my_reel_name() to authenticated;

drop policy if exists "team adds reels" on public.reels;
create policy "team adds reels" on public.reels for insert to authenticated
  with check (public.is_team_member() and (status in ('to_check', 'skip') or public.is_primary_owner()));

drop policy if exists "team changes reels" on public.reels;
create policy "team changes reels" on public.reels for update to authenticated
  using (public.is_team_member() and (public.is_primary_owner() or (added_by = public.my_reel_name() and status <> 'pinned')))
  with check (public.is_team_member() and (status in ('to_check', 'skip') or public.is_primary_owner()));
