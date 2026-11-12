-- SPOTTED: A REFERENCE CODE FOR EVERY APPLICATION (Supabase / Postgres)
--
-- Run this AFTER applications.sql and apply_insider_form.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * Every application gets a REFERENCE CODE made by the database when it is saved. Nobody types it.
--       restaurant or shop (Partner) : 4 letters then 4 numbers      for example  QMTR4827
--       influencer (Insider)         : 6 letters then 6 numbers      for example  WXZKPL705314
--     Letters come first, then numbers. The code never uses O or I (letters) or 0 or 1 (numbers), so it cannot be misread.
--     It is random, no two are the same, and it never changes.
--   * The code is a reference number for now. It becomes the person's active code once the team approves them.
--   * Two new database functions send an application AND give the code back to the browser (visitors still cannot read the table):
--       submit_insider_application_with_code   (the 7-step Insider form)
--       submit_application_with_code           (the Partner form; the number of branches is no longer asked: partners add branches
--                                               later in their dashboard, so the form sends 1)
--   * Applications saved before this file get a code too.

alter table public.applications add column reference_code text;

-- A random whole number from 0 up to n - 1, with no lean (the database's strong random source).
create function public.apply_random_below(n integer) returns integer
language plpgsql volatile as $$
declare
  top integer := 256 - (256 % n);
  b integer;
begin
  loop
    b := get_byte(uuid_send(gen_random_uuid()), 0);
    if b < top then return b % n; end if;
  end loop;
end $$;

create function public.apply_make_reference_code(p_letters integer, p_digits integer) returns text
language plpgsql volatile as $$
declare
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';   -- 24 letters: no I, no O
  digits  constant text := '23456789';                    -- 8 numbers: no 0, no 1
  result  text := '';
begin
  for i in 1..p_letters loop result := result || substr(letters, public.apply_random_below(24) + 1, 1); end loop;
  for i in 1..p_digits loop result := result || substr(digits, public.apply_random_below(8) + 1, 1); end loop;
  return result;
end $$;

-- A code nobody has yet: Partner = 4 + 4, Insider = 6 + 6.
create function public.apply_next_reference_code(p_kind text) returns text
language plpgsql volatile as $$
declare
  c text;
  tries integer := 0;
begin
  loop
    c := case when p_kind = 'insider' then public.apply_make_reference_code(6, 6) else public.apply_make_reference_code(4, 4) end;
    if not exists (select 1 from public.applications a where a.reference_code = c) then return c; end if;
    tries := tries + 1;
    if tries >= 1000 then raise exception 'APPLY: Could not make a code. Please try again.'; end if;
  end loop;
end $$;

-- Made on Save, whatever was sent; never changed afterwards.
create function public.applications_reference_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.reference_code := public.apply_next_reference_code(new.kind);
  elsif old.reference_code is not null then
    new.reference_code := old.reference_code;
  end if;
  return new;
end $$;
create trigger applications_reference_code before insert or update on public.applications
  for each row execute function public.applications_reference_code();

-- Applications saved earlier get a code now.
update public.applications set reference_code = public.apply_next_reference_code(kind) where reference_code is null;

alter table public.applications alter column reference_code set not null;
alter table public.applications add constraint applications_reference_code_shape check (
  (kind = 'insider' and reference_code ~ '^[A-HJ-NP-Z]{6}[2-9]{6}$') or (kind = 'partner' and reference_code ~ '^[A-HJ-NP-Z]{4}[2-9]{4}$')
);
create unique index applications_reference_code_key on public.applications (reference_code);

-- The two ways in that also hand back the code.
create function public.submit_insider_application_with_code(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := public.submit_insider_application(p);
  v_code text;
begin
  select a.reference_code into v_code from public.applications a where a.id = v_id;
  return v_code;
end $$;

create function public.submit_application_with_code(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_code text;
begin
  -- the Partner form no longer asks for branches (they are added later in the dashboard): one is the starting number
  v_id := public.submit_application(case when p ->> 'kind' = 'partner' and (p ->> 'branches') is null then p || '{"branches": 1}'::jsonb else p end);
  select a.reference_code into v_code from public.applications a where a.id = v_id;
  return v_code;
end $$;

revoke all on function public.submit_insider_application_with_code(jsonb), public.submit_application_with_code(jsonb),
  public.apply_random_below(integer), public.apply_make_reference_code(integer, integer), public.apply_next_reference_code(text),
  public.applications_reference_code() from public, anon, authenticated;
grant execute on function public.submit_insider_application_with_code(jsonb), public.submit_application_with_code(jsonb) to anon, authenticated;

-- TO UNDO (do not run unless you really want to remove the codes):
--   drop function public.submit_insider_application_with_code(jsonb), public.submit_application_with_code(jsonb);
--   drop trigger applications_reference_code on public.applications;
--   drop function public.applications_reference_code(), public.apply_next_reference_code(text), public.apply_make_reference_code(integer, integer), public.apply_random_below(integer);
--   alter table public.applications drop column reference_code;
