-- SPOTTED PIN DESK: "ORDER ONLY" BUSINESSES (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql and the other Pin Desk files. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * A restaurant or shop gets "How people get it": a place to visit (the default), order only (no place to visit), or both.
--     Home bakeries, home kitchens and cloud kitchens are "order only".
--   * For order only or both: HOW TO ORDER (by Instagram message, by business WhatsApp, a website, or an app name, any of them)
--     and WHERE THEY DELIVER (emirates, and areas typed as free text).
--   * THERE IS NO ADDRESS COLUMN, on purpose. A home address is never stored. Type areas only (for example "Khalifa City").
--   * Everything is optional, and the database never refuses a save because of these fields: text that is too long is cut short,
--     and an emirate that is not one of the seven is dropped.
--   * ORDER-ONLY PLACES ARE NEVER USED FOR NEARBY REMINDERS. The column nearby_ok is filled in by the database itself: it is false
--     for "order only" and true otherwise (a "both" place is only ever used through its own locations). It cannot be set by hand.
--     Reminder code must only use businesses where nearby_ok is true.
--   * A reel can link to an order-only business with no location at all.
--   * "How to order" can be marked "Not needed" by an admin, like the other details. Only admins can do that (as before).
--   * Every business saved before this file stays "a place to visit". Nothing is deleted.

alter table public.businesses
  add column access_kind      text not null default 'place' check (access_kind in ('place', 'order_only', 'both')),
  add column order_instagram  boolean not null default false,     -- order by an Instagram message (to the business's Instagram handle)
  add column order_whatsapp   boolean not null default false,     -- order by WhatsApp (to the business WhatsApp number)
  add column order_website    text check (char_length(order_website) <= 200),
  add column order_app        text check (char_length(order_app) <= 80),
  add column deliver_emirates text[] not null default '{}',
  add column deliver_areas    text check (char_length(deliver_areas) <= 500),
  add column nearby_ok        boolean generated always as (access_kind <> 'order_only') stored;

-- Tidy before the rules look at it, so a save is never refused for these optional fields.
create function public.business_order_tidy() returns trigger
language plpgsql as $$
begin
  new.order_website := nullif(left(trim(coalesce(new.order_website, '')), 200), '');
  new.order_app     := nullif(left(trim(coalesce(new.order_app, '')), 80), '');
  new.deliver_areas := nullif(left(trim(coalesce(new.deliver_areas, '')), 500), '');
  new.deliver_emirates := coalesce((
    select array_agg(e order by e)
    from (select distinct trim(x) as e from unnest(coalesce(new.deliver_emirates, '{}')) x) s
    where e in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah')
  ), '{}');
  return new;
end $$;
create trigger businesses_order_tidy before insert or update on public.businesses
  for each row execute function public.business_order_tidy();

-- "Not needed" can now also be set for "how to order" (and then the order details must be empty).
create or replace function public.business_not_needed_ok(j jsonb) returns boolean
language plpgsql immutable as $$
declare
  k text;
begin
  if jsonb_typeof(j) is distinct from 'object' then return false; end if;
  for k in select jsonb_object_keys(j) loop
    if k not in ('subtype', 'instagram_handle', 'business_email', 'business_whatsapp', 'contact', 'locations', 'reels', 'how_to_order') then return false; end if;
    if jsonb_typeof(j -> k) is distinct from 'boolean' then return false; end if;
  end loop;
  return true;
end $$;

alter table public.businesses drop constraint not_needed_means_empty;
alter table public.businesses add constraint not_needed_means_empty check (
  not ((not_needed ->> 'subtype') is not distinct from 'true' and subtype is not null)
  and not ((not_needed ->> 'instagram_handle') is not distinct from 'true' and instagram_handle is not null)
  and not ((not_needed ->> 'business_email') is not distinct from 'true' and business_email is not null)
  and not ((not_needed ->> 'business_whatsapp') is not distinct from 'true' and business_whatsapp is not null)
  and not ((not_needed ->> 'contact') is not distinct from 'true' and (business_email is not null or business_whatsapp is not null))
  and not ((not_needed ->> 'how_to_order') is not distinct from 'true'
           and (order_instagram or order_whatsapp or order_website is not null or order_app is not null))
);

-- TO UNDO (do not run unless you really want to remove these fields and what was typed in them):
--   alter table public.businesses drop constraint not_needed_means_empty;
--   (then run the "not_needed_means_empty" part of pindesk_complete.sql again)
--   drop trigger businesses_order_tidy on public.businesses;  drop function public.business_order_tidy();
--   alter table public.businesses drop column nearby_ok, drop column deliver_areas, drop column deliver_emirates,
--     drop column order_app, drop column order_website, drop column order_whatsapp, drop column order_instagram, drop column access_kind;
