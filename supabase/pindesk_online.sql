-- SPOTTED PIN DESK: ONLINE OFFERS (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql (and the other Pin Desk files). It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * A reel offer can now be "At the place" or "Online or in an app" (where_kind).
--   * An online offer can name the app or website (Smiles, Noon, Talabat, Deliveroo, Careem, or anything typed) and a promo code.
--   * A reel offer can be linked to a restaurant or shop, or to no place at all (business_id).
--   * Everything is optional, and the database never refuses a save because of these fields: a name or code that is too long
--     is cut short, and empty boxes become "nothing".
--   * ONLINE OFFERS ARE NEVER USED FOR NEARBY REMINDERS. The column nearby_ok is filled in by the database itself:
--     it is true only for "At the place" offers, and it can never be set by hand. Reminder code must only use offers where nearby_ok is true.
--   * Every offer saved before this file stays "At the place". Nothing is deleted.

alter table public.reel_offers
  add column where_kind  text not null default 'place' check (where_kind in ('place', 'online')),
  add column online_name text check (char_length(online_name) <= 80),
  add column promo_code  text check (char_length(promo_code) <= 40),
  add column business_id uuid references public.businesses (id) on delete set null,
  add column nearby_ok   boolean generated always as (where_kind = 'place') stored;

create index reel_offers_business_idx on public.reel_offers (business_id);

-- Tidy before the rules look at it, so a save is never refused for these optional fields.
create function public.reel_offer_tidy() returns trigger
language plpgsql as $$
begin
  new.online_name := nullif(left(trim(coalesce(new.online_name, '')), 80), '');
  new.promo_code  := nullif(left(trim(coalesce(new.promo_code, '')), 40), '');
  if new.where_kind = 'place' then new.online_name := null; end if;   -- an app name only belongs to an online offer
  return new;
end $$;
create trigger reel_offers_tidy before insert or update on public.reel_offers
  for each row execute function public.reel_offer_tidy();

-- TO UNDO (do not run unless you really want to remove these fields and what was typed in them):
--   drop trigger reel_offers_tidy on public.reel_offers;  drop function public.reel_offer_tidy();
--   alter table public.reel_offers drop column nearby_ok, drop column business_id, drop column promo_code,
--     drop column online_name, drop column where_kind;
