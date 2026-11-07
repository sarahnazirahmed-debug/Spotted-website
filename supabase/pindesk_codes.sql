-- SPOTTED PIN DESK: THE CODE MAKER (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * When the team presses Save on a NEW restaurant or shop, location or reel, the DATABASE makes its code.
--     Nobody types a code. If something tries to send a code, it is ignored and a fresh one is made.
--   * The shapes:
--       restaurant or shop : 4 letters then 4 numbers        for example  KQXM4729   (8 characters)
--       location           : 10 letters then 10 numbers      for example  KQXMWTZRBD47293856   (20 characters)
--       reel               : 8 letters then 8 numbers        for example  KQXMWTZR47293856   (16 characters)
--   * The letters never include O or I, and the numbers never include 0 or 1, so a code can never be
--     mistaken for something else. So the letters come from A B C D E F G H J K L M N P Q R S T U V W X Y Z
--     (24 of them) and the numbers from 2 3 4 5 6 7 8 9 (8 of them).
--   * Codes are random, and no two are the same (the database checks before it hands one out, and a rule on
--     the table refuses a repeat as the last guard).
--   * A code never changes after it is made.
--   * Codes are for the team only. They sit in tables that only team members can read, and no function that
--     the website or the app can call returns a code.
--
-- Anything saved with an older style code (such as BUS-000001, from pindesk.sql) is given a new code here.

-- ---------------------------------------------------------------------------
-- The helpers
-- ---------------------------------------------------------------------------
-- A random whole number from 0 up to n - 1, with no lean towards any number.
create function public.random_below(n integer) returns integer
language plpgsql volatile as $$
declare
  top integer := 256 - (256 % n);     -- throw away the few bytes that would make some numbers more likely
  b integer;
begin
  if n < 1 or n > 256 then raise exception 'random_below needs a number from 1 to 256.'; end if;
  loop
    b := get_byte(uuid_send(gen_random_uuid()), 0);   -- gen_random_uuid() uses the database's strong random source
    if b < top then return b % n; end if;
  end loop;
end $$;

-- A code: p_letters letters, then p_digits numbers. No O, I, 0 or 1.
create function public.make_code(p_letters integer, p_digits integer) returns text
language plpgsql volatile as $$
declare
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';   -- 24 letters: no I, no O
  digits  constant text := '23456789';                    -- 8 numbers: no 0, no 1
  result  text := '';
begin
  if p_letters < 1 or p_digits < 1 or p_letters + p_digits > 40 then
    raise exception 'A code needs at least 1 letter and 1 number, and at most 40 characters.';
  end if;
  for i in 1..p_letters loop
    result := result || substr(letters, public.random_below(24) + 1, 1);
  end loop;
  for i in 1..p_digits loop
    result := result || substr(digits, public.random_below(8) + 1, 1);
  end loop;
  return result;
end $$;

-- A code that no row in the table has yet. (Capital letters do not matter when comparing.)
create function public.next_free_code(p_table regclass, p_letters integer, p_digits integer) returns text
language plpgsql volatile as $$
declare
  c text;
  taken boolean;
  tries integer := 0;
begin
  loop
    c := public.make_code(p_letters, p_digits);
    execute format('select exists (select 1 from %s where lower(code) = lower($1))', p_table) into taken using c;
    if not taken then return c; end if;
    tries := tries + 1;
    if tries >= 1000 then
      raise exception 'Could not find a free code. Please try again.' using errcode = 'P0001';
    end if;
  end loop;
end $$;

-- Only the database itself may use these. The website and the app cannot call them.
revoke all on function public.random_below(integer), public.make_code(integer, integer),
  public.next_free_code(regclass, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The trigger: make the code on Save. It replaces the one from pindesk.sql.
-- ---------------------------------------------------------------------------
create or replace function public.pindesk_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- always made here, whatever was sent
    new.code := public.next_free_code(tg_relid, tg_argv[0]::integer, tg_argv[1]::integer);
  elsif current_setting('pindesk.allow_recode', true) is distinct from 'on' then
    new.code := old.code;   -- a code never changes
  end if;
  return new;
end $$;

drop trigger businesses_code on public.businesses;
drop trigger locations_code on public.locations;
drop trigger reels_code on public.reels;
create trigger businesses_code before insert or update on public.businesses
  for each row execute function public.pindesk_code(4, 4);
create trigger locations_code before insert or update on public.locations
  for each row execute function public.pindesk_code(10, 10);
create trigger reels_code before insert or update on public.reels
  for each row execute function public.pindesk_code(8, 8);

-- ---------------------------------------------------------------------------
-- Give anything saved earlier a new-style code, then make the shape a rule of the table
-- ---------------------------------------------------------------------------
-- remove the old, looser rule on the code column of each table
do $$
declare
  t text;
  c record;
begin
  foreach t in array array['businesses', 'locations', 'reels'] loop
    for c in
      select conname from pg_constraint
      where conrelid = ('public.' || t)::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%code ~%'
    loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
    end loop;
  end loop;
end $$;

select set_config('pindesk.allow_recode', 'on', false);
update public.businesses set code = public.next_free_code('public.businesses'::regclass, 4, 4)   where code !~ '^[A-HJ-NP-Z]{4}[2-9]{4}$';
update public.locations  set code = public.next_free_code('public.locations'::regclass, 10, 10) where code !~ '^[A-HJ-NP-Z]{10}[2-9]{10}$';
update public.reels      set code = public.next_free_code('public.reels'::regclass, 8, 8)       where code !~ '^[A-HJ-NP-Z]{8}[2-9]{8}$';
select set_config('pindesk.allow_recode', '', false);

alter table public.businesses add constraint businesses_code_shape check (code ~ '^[A-HJ-NP-Z]{4}[2-9]{4}$');
alter table public.locations  add constraint locations_code_shape  check (code ~ '^[A-HJ-NP-Z]{10}[2-9]{10}$');
alter table public.reels      add constraint reels_code_shape      check (code ~ '^[A-HJ-NP-Z]{8}[2-9]{8}$');

-- (The number sequences from pindesk.sql are no longer used. They are harmless and are left in place.)
