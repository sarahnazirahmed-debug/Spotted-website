-- RESET: removes ONLY the Spotted tables, functions and word lists made by schema.sql, so that
-- schema.sql can be run again from a clean start. It does not touch anything else.
-- WARNING: it deletes whatever is stored in those tables. Use it only on a new, empty project.

drop table if exists public.reviews, public.pin_ledger, public.stars, public.media, public.offers,
  public.places, public.partner_accounts, public.profiles, public.waitlist cascade;

-- dropping the function also removes the sign-up trigger that uses it
drop function if exists public.handle_new_user() cascade;
drop function if exists public.my_partner_ids() cascade;

drop type if exists public.partner_kind, public.place_kind, public.star_kind, public.media_kind cascade;
