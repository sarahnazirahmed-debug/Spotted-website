-- SPOTTED: THE "RATE US" STAR (Supabase / Postgres)
--
-- Run this AFTER admin.sql (it uses the team helper functions). It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
-- To READ the ratings: Supabase > Table Editor > star_feedback.
--
-- WHAT IT DOES, in plain words:
--   * Anyone (no sign-in) can ADD one rating: which thing they rated (website or app), 1 to 5, an optional note, and the page they were on.
--   * NOBODY on the website can read, change or delete ratings. Only team members can read them (through the Pin Desk later),
--     and only the main admin and associates can delete one (for example spam).
--   * The database makes the date itself. A rating can never carry a date or an id typed by the visitor.
--   * RATE LIMIT, in the database: one browser can add at most 3 ratings an hour, and the whole site at most 120 an hour.
--     Over that, the database refuses with a plain message.
--   * visitor_key is a random code the browser makes up (nothing about the person). It is only used for the rate limit.

create table public.star_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  about       text not null check (about in ('website', 'app')),
  rating      smallint not null check (rating between 1 and 5),
  note        text check (char_length(note) <= 500),
  page        text check (char_length(page) <= 200),
  visitor_key text not null check (visitor_key ~ '^[a-f0-9-]{8,64}$')
);
create index star_feedback_created_idx on public.star_feedback (created_at desc);
create index star_feedback_key_idx on public.star_feedback (visitor_key, created_at desc);

-- Tidy and limit before the row is saved.
create function public.star_feedback_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.note := nullif(left(trim(coalesce(new.note, '')), 500), '');
  new.page := nullif(left(trim(coalesce(new.page, '')), 200), '');
  if (select count(*) from public.star_feedback f where f.visitor_key = new.visitor_key and f.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many ratings from this browser. Please try again later.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.star_feedback f where f.created_at > now() - interval '1 hour') >= 120 then
    raise exception 'Too many ratings right now. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger star_feedback_guard before insert on public.star_feedback
  for each row execute function public.star_feedback_guard();

-- Privacy rules: insert only for visitors; the team reads.
alter table public.star_feedback enable row level security;
revoke all on public.star_feedback from anon, authenticated;
grant insert on public.star_feedback to anon, authenticated;
grant select, delete on public.star_feedback to authenticated;
create policy "anyone can add a rating" on public.star_feedback
  for insert to anon, authenticated with check (true);
create policy "the team reads the ratings" on public.star_feedback
  for select to authenticated using (public.is_team_member());
create policy "main admin and associates delete ratings" on public.star_feedback
  for delete to authenticated using (public.is_team_manager());

-- TO UNDO (do not run unless you really want to remove the table and every rating in it):
--   drop table public.star_feedback;  drop function public.star_feedback_guard();
