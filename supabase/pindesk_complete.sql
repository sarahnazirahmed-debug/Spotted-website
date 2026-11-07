-- SPOTTED PIN DESK: "NOT NEEDED" AND THE COMPLETE TICK (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql, pindesk_codes.sql, pindesk_offers.sql and pindesk_log.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * A restaurant or shop gets a tick when these six are each filled in or marked "Not needed":
--     name, type, Instagram handle, at least one location, at least one reel, a business contact (email or WhatsApp).
--   * "Not needed" can now also be set for: contact, locations and reels (before: kind, Instagram, email, WhatsApp).
--     If "contact" is Not needed, the business email and WhatsApp must be empty.
--   * ONLY the main admin and associates can set or change "Not needed". The database refuses anyone else.
--   * Nothing is deleted by this file.

create or replace function public.business_not_needed_ok(j jsonb) returns boolean
language plpgsql immutable as $$
declare
  k text;
begin
  if jsonb_typeof(j) is distinct from 'object' then return false; end if;
  for k in select jsonb_object_keys(j) loop
    if k not in ('subtype', 'instagram_handle', 'business_email', 'business_whatsapp', 'contact', 'locations', 'reels') then return false; end if;
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
);

create function public.business_not_needed_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_team_manager() then
    if (tg_op = 'INSERT' and new.not_needed <> '{}'::jsonb) or (tg_op = 'UPDATE' and new.not_needed is distinct from old.not_needed) then
      raise exception 'Only the main admin and associates can mark something as Not needed.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger businesses_not_needed_admin before insert or update on public.businesses
  for each row execute function public.business_not_needed_admin();
