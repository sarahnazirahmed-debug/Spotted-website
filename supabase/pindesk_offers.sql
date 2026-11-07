-- SPOTTED PIN DESK: MOVE THE OLD OFFER TEXT OVER (Supabase / Postgres)
--
-- Run this AFTER pindesk.sql and pindesk_codes.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run.
--
-- WHAT IT DOES, in plain words:
--   * Before, a reel had ONE free-text offer box (offer text, start, end, hours). The Pin Desk now holds several
--     deals and offers per reel, in their own tables.
--   * This file copies each old offer over ONCE, as a "reel offer": the old text becomes the title, the end date
--     is kept, and the start date and hours go into "conditions". Nothing is deleted: the old columns stay as they are.
--   * Each reel is marked with the time it was moved (offer_moved_at), so running this file again does nothing new.

alter table public.reels add column if not exists offer_moved_at timestamptz;

insert into public.reel_offers (reel_id, title, conditions, end_date, added_by)
select
  r.id,
  left(trim(r.offer_text), 160),
  nullif(left(concat_ws(E'\n',
    case when char_length(trim(r.offer_text)) > 160 then trim(r.offer_text) end,
    case when r.offer_start is not null then 'Starts: ' || r.offer_start end,
    case when nullif(trim(r.offer_hours), '') is not null then 'Hours: ' || trim(r.offer_hours) end
  ), 2000), ''),
  r.offer_end,
  r.added_by
from public.reels r
where nullif(trim(r.offer_text), '') is not null and r.offer_moved_at is null;

update public.reels set offer_moved_at = now() where offer_moved_at is null;
