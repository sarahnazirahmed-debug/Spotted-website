-- Approved 24 Nov 2026: keep the original phone URL and add an optional laptop/desktop URL.
alter table public.reels add column if not exists laptop_url text;
