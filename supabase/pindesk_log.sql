-- SPOTTED PIN DESK: THE CHANGE LOG (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql, pindesk_codes.sql and pindesk_offers.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * Every time a restaurant or shop, a location, a place inside a building, a reel, an item, a deal, a price line or
--     an offer is ADDED, CHANGED or REMOVED, the database writes one line in the "change_log" table:
--     which row, what happened, who did it (from their log-in), when, and for a change, each field's old and new value.
--   * Nobody can write to, change or delete the log from the website. Only the database writes it (triggers).
--     The team can read it. App users and the public cannot.
--   * "Who" is the team member's name from their log-in. A change made in the SQL Editor shows as "database".

create table public.change_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     uuid not null,
  parent_id  uuid,                       -- the reel (or location) this row belongs to, so a reel's page can show its deals and offers too
  action     text not null check (action in ('added', 'changed', 'removed')),
  label      text,                       -- a short name for the row, for example the place name or the deal title
  changes    jsonb not null default '{}'::jsonb,   -- for a change: { "column": { "from": ..., "to": ... } }
  changed_by text not null,
  changed_at timestamptz not null default now()
);
create index change_log_row_idx on public.change_log (row_id, changed_at desc);
create index change_log_parent_idx on public.change_log (parent_id, changed_at desc);

alter table public.change_log enable row level security;
revoke all on public.change_log from anon, authenticated;
grant select on public.change_log to authenticated;
create policy "team reads the change log" on public.change_log for select to authenticated using (public.is_team_member());

create function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who   text;
  o     jsonb;
  n     jsonb;
  j     jsonb;
  diff  jsonb := '{}'::jsonb;
  k     text;
  act   text;
  par   uuid;
  lbl   text;
begin
  who := coalesce(nullif(public.my_team_name(), ''), nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), 'database');
  if tg_op = 'DELETE' then
    j := to_jsonb(old); act := 'removed';
  else
    j := to_jsonb(new);
  end if;
  if tg_op = 'INSERT' then act := 'added'; end if;
  if tg_op = 'UPDATE' then
    act := 'changed'; o := to_jsonb(old); n := to_jsonb(new);
    for k in select jsonb_object_keys(n) loop
      if k in ('updated_at', 'created_at') then continue; end if;
      if (n -> k) is distinct from (o -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', o -> k, 'to', n -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;   -- nothing really changed
  end if;

  -- which reel or location does this row belong to?
  par := case tg_table_name
    when 'reel_items' then (j ->> 'reel_id')::uuid
    when 'reel_deals' then (j ->> 'reel_id')::uuid
    when 'reel_offers' then (j ->> 'reel_id')::uuid
    when 'building_places' then (j ->> 'location_id')::uuid
    when 'reel_deal_prices' then (select d.reel_id from public.reel_deals d where d.id = (j ->> 'deal_id')::uuid)
    else null end;
  lbl := coalesce(j ->> 'name', j ->> 'title', j ->> 'place_name', j ->> 'url',
                  case when j ? 'people' then (j ->> 'people') || ' people: AED ' || (j ->> 'total_price_aed') end);

  insert into public.change_log (table_name, row_id, parent_id, action, label, changes, changed_by)
  values (tg_table_name, (j ->> 'id')::uuid, par, act, lbl, diff, who);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.log_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['businesses', 'locations', 'building_places', 'reels', 'reel_items', 'reel_deals', 'reel_deal_prices', 'reel_offers'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()', t || '_log', t);
  end loop;
end $$;

-- TO UNDO (do not run unless you really want to remove the log):
--   drop table public.change_log;  drop function public.log_change();   (the triggers go with the table functions: drop them first with
--   drop trigger <table>_log on public.<table>;  for each of the eight tables)
