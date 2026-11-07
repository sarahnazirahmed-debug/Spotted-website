-- SPOTTED APPLICATIONS (Supabase / Postgres)
--
-- Run this AFTER pindesk_codes.sql (it uses the code maker from that file). It is a new file; the older files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * The public Apply page (Insider or Partner) saves an application in the table `applications`, with the status "New".
--   * Nobody on the website can READ applications back. Only the main admin and associates can read them and
--     change the status (New -> Approved or Declined) in /admin/applications.
--   * A visitor cannot write into the table directly. They call ONE function, submit_application(), and the DATABASE
--     checks everything: all three tick boxes, age 18 or over (worked out from the date of birth, never asked), the invite
--     code for Founding Insiders, the required fields and the required PDFs. If anything is wrong it refuses.
--   * Founding Insider invite codes are made by the main admin or an associate (create_invite_code). Each code works ONCE.
--     Codes are random: 6 letters then 4 numbers (never O, I, 0 or 1).
--   * The PDFs go into a PRIVATE storage bucket called `applications` (never public): only PDF files, 5 MB at most.
--     Anyone can upload a file into the "pending" folder, but nobody except the main admin and associates can read one.

-- ---------------------------------------------------------------------------
-- Founding Insider invite codes
-- ---------------------------------------------------------------------------
create table public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9]{8,20}$'),
  note        text check (char_length(note) <= 200),          -- who it is for (your own note)
  created_by  text,
  created_at  timestamptz not null default now(),
  used_at     timestamptz,                                     -- set when an application uses it
  used_by     uuid                                             -- the application that used it
);
alter table public.invite_codes enable row level security;
revoke all on public.invite_codes from anon, authenticated;
grant select on public.invite_codes to authenticated;
create policy "main admin and associates read invite codes" on public.invite_codes
  for select to authenticated using (public.is_team_manager());

-- Make a new code (only the main admin and associates). Returns the code.
create function public.create_invite_code(p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if not public.is_team_manager() then
    raise exception 'Only the main admin and associates can make invite codes.';
  end if;
  loop
    c := public.make_code(6, 4);
    exit when not exists (select 1 from public.invite_codes where code = c);
  end loop;
  insert into public.invite_codes (code, note, created_by)
  values (c, nullif(left(btrim(coalesce(p_note, '')), 200), ''), public.my_team_name());
  return c;
end $$;

-- ---------------------------------------------------------------------------
-- The applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('insider', 'partner')),
  status        text not null default 'New' check (status in ('New', 'Approved', 'Declined')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    text,

  -- both
  contact_name  text not null check (char_length(contact_name) between 1 and 120),   -- full name (Insider) or owner / manager name (Partner)
  email         text not null check (email = lower(email) and char_length(email) <= 254),
  phone         text not null check (char_length(phone) between 5 and 40),            -- phone or WhatsApp
  instagram     text check (char_length(instagram) <= 60),                            -- Insider: personal handle. Partner: business handle

  -- Insider
  join_type            text check (join_type in ('regular', 'founding')),
  invite_code_id       uuid references public.invite_codes (id),
  date_of_birth        date,                                                           -- the age is worked out from it, never asked
  profile_link         text check (char_length(profile_link) <= 500),
  tiktok               text check (char_length(tiktok) <= 60),
  youtube_link         text check (char_length(youtube_link) <= 500),
  snapchat             text check (char_length(snapchat) <= 60),
  other_platform_name  text check (char_length(other_platform_name) <= 80),
  other_platform_link  text check (char_length(other_platform_link) <= 500),

  -- Partner
  business_name  text check (char_length(business_name) <= 160),
  business_type  text check (business_type in ('Restaurant', 'Cafe', 'Cafeteria', 'Bakery', 'Sweets', 'Cloud or home kitchen', 'Shop')),
  website        text check (char_length(website) <= 500),
  emirate        text check (emirate in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah')),
  branches       integer check (branches between 1 and 500),
  plan_interest  text check (char_length(plan_interest) <= 80),

  -- the PDFs (paths inside the private `applications` bucket)
  advertiser_permit_path  text,     -- Insider, required
  trade_licence_path      text,     -- Insider: optional. Partner: required
  food_permit_path        text,     -- Partner: required for food and drink

  -- the three tick boxes (all three are required, so these are never empty)
  accepted_terms_at            timestamptz not null,
  accepted_privacy_at          timestamptz not null,
  accepted_confidentiality_at  timestamptz not null
);
alter table public.applications enable row level security;
revoke all on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant update (status) on public.applications to authenticated;       -- the team can only change the status
create policy "main admin and associates read applications" on public.applications
  for select to authenticated using (public.is_team_manager());
create policy "main admin and associates update the status" on public.applications
  for update to authenticated using (public.is_team_manager()) with check (public.is_team_manager());

-- When the status changes, write down when and by whom.
create function public.stamp_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.decided_at := now();
    new.decided_by := public.my_team_name();
  end if;
  return new;
end $$;
create trigger applications_stamp before update on public.applications
  for each row execute function public.stamp_application();

-- ---------------------------------------------------------------------------
-- Is this a good PDF path? Uploads go to pending/<random id>/<permit | licence | food-permit>.pdf
-- ---------------------------------------------------------------------------
create function public.application_path_ok(p_path text, p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if p_path is null or p_path !~ ('^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' || p_name || '\.pdf$') then
    return false;
  end if;
  -- on Supabase the file must really be in the private bucket (the in-memory test database has no storage)
  if to_regclass('storage.objects') is not null then
    declare ok boolean;
    begin
      execute 'select exists (select 1 from storage.objects where bucket_id = ''applications'' and name = $1)' into ok using p_path;
      return ok;
    end;
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- THE ONE WAY IN: submit_application(p jsonb). Every rule is checked here, by the database.
-- ---------------------------------------------------------------------------
create function public.submit_application(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_kind    text := p ->> 'kind';
  v_name    text := nullif(btrim(coalesce(p ->> 'contact_name', '')), '');
  v_email   text := lower(nullif(btrim(coalesce(p ->> 'email', '')), ''));
  v_phone   text := nullif(btrim(coalesce(p ->> 'phone', '')), '');
  v_insta   text := nullif(btrim(coalesce(p ->> 'instagram', '')), '');
  v_tiktok  text := nullif(btrim(coalesce(p ->> 'tiktok', '')), '');
  v_join    text := coalesce(p ->> 'join_type', 'regular');
  v_dob     date;
  v_code_id uuid;
  v_type    text := p ->> 'business_type';
  v_branch  integer;
  v_id      uuid;
begin
  -- the three tick boxes
  if coalesce(p ->> 'accepted_terms', '') <> 'true' or coalesce(p ->> 'accepted_privacy', '') <> 'true'
     or coalesce(p ->> 'accepted_confidentiality', '') <> 'true' then
    raise exception 'APPLY: Please tick all three boxes before you send.';
  end if;
  if v_kind not in ('insider', 'partner') then raise exception 'APPLY: Please choose Insider or Partner.'; end if;
  if v_name is null then raise exception 'APPLY: Please tell us your name.'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'APPLY: Please enter a valid email.'; end if;
  if v_phone is null then raise exception 'APPLY: Please enter a phone or WhatsApp number.'; end if;

  if v_kind = 'insider' then
    if v_join not in ('regular', 'founding') then raise exception 'APPLY: Please choose how you are joining.'; end if;
    begin
      v_dob := nullif(p ->> 'date_of_birth', '')::date;
    exception when others then
      v_dob := null;
    end;
    if v_dob is null then raise exception 'APPLY: Please enter your date of birth.'; end if;
    -- the age is worked out here, from the date of birth. Under 18 is refused.
    if v_dob > current_date or extract(year from age(current_date, v_dob)) < 18 then
      raise exception 'APPLY: You must be 18 or over to apply.';
    end if;
    if nullif(btrim(coalesce(p ->> 'profile_link', '')), '') is null then raise exception 'APPLY: Please add the link to your main profile.'; end if;
    if v_insta is null and v_tiktok is null then raise exception 'APPLY: Please add your Instagram or TikTok handle.'; end if;
    if not public.application_path_ok(p ->> 'advertiser_permit_path', 'permit') then
      raise exception 'APPLY: Please upload your UAE Advertiser Permit (PDF).';
    end if;
    if nullif(p ->> 'trade_licence_path', '') is not null and not public.application_path_ok(p ->> 'trade_licence_path', 'licence') then
      raise exception 'APPLY: The trade licence file did not upload. Please try again.';
    end if;
    if v_join = 'founding' then
      select id into v_code_id from public.invite_codes
      where code = upper(btrim(coalesce(p ->> 'invite_code', ''))) and used_at is null for update;
      if v_code_id is null then raise exception 'APPLY: That invite code is not valid, or it has already been used.'; end if;
    end if;
  else
    if nullif(btrim(coalesce(p ->> 'business_name', '')), '') is null then raise exception 'APPLY: Please enter the business name.'; end if;
    if v_type not in ('Restaurant', 'Cafe', 'Cafeteria', 'Bakery', 'Sweets', 'Cloud or home kitchen', 'Shop') then
      raise exception 'APPLY: Please choose what kind of business you are.';
    end if;
    if v_insta is null then raise exception 'APPLY: Please add the business Instagram handle.'; end if;
    if (p ->> 'emirate') not in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah') or (p ->> 'emirate') is null then
      raise exception 'APPLY: Please choose the emirate.';
    end if;
    begin
      v_branch := (p ->> 'branches')::integer;
    exception when others then
      v_branch := null;
    end;
    if v_branch is null or v_branch < 1 or v_branch > 500 then raise exception 'APPLY: Please enter the number of branches (1 or more).'; end if;
    if not public.application_path_ok(p ->> 'trade_licence_path', 'licence') then
      raise exception 'APPLY: Please upload your UAE trade licence (PDF).';
    end if;
    -- anything food or drink needs a food permit; only a Shop does not
    if v_type <> 'Shop' and not public.application_path_ok(p ->> 'food_permit_path', 'food-permit') then
      raise exception 'APPLY: Please upload your food permit (PDF). It is required for food and drink businesses.';
    end if;
  end if;

  insert into public.applications (
    kind, contact_name, email, phone, instagram,
    join_type, invite_code_id, date_of_birth, profile_link, tiktok, youtube_link, snapchat, other_platform_name, other_platform_link,
    business_name, business_type, website, emirate, branches, plan_interest,
    advertiser_permit_path, trade_licence_path, food_permit_path,
    accepted_terms_at, accepted_privacy_at, accepted_confidentiality_at
  ) values (
    v_kind, left(v_name, 120), v_email, left(v_phone, 40), left(v_insta, 60),
    case when v_kind = 'insider' then v_join end, v_code_id, v_dob,
    left(nullif(btrim(coalesce(p ->> 'profile_link', '')), ''), 500), left(v_tiktok, 60),
    left(nullif(btrim(coalesce(p ->> 'youtube_link', '')), ''), 500), left(nullif(btrim(coalesce(p ->> 'snapchat', '')), ''), 60),
    left(nullif(btrim(coalesce(p ->> 'other_platform_name', '')), ''), 80), left(nullif(btrim(coalesce(p ->> 'other_platform_link', '')), ''), 500),
    case when v_kind = 'partner' then left(btrim(p ->> 'business_name'), 160) end,
    case when v_kind = 'partner' then v_type end,
    case when v_kind = 'partner' then left(nullif(btrim(coalesce(p ->> 'website', '')), ''), 500) end,
    case when v_kind = 'partner' then p ->> 'emirate' end,
    case when v_kind = 'partner' then v_branch end,
    case when v_kind = 'partner' then left(nullif(btrim(coalesce(p ->> 'plan_interest', '')), ''), 80) end,
    nullif(p ->> 'advertiser_permit_path', ''), nullif(p ->> 'trade_licence_path', ''), nullif(p ->> 'food_permit_path', ''),
    now(), now(), now()
  ) returning id into v_id;

  if v_code_id is not null then
    update public.invite_codes set used_at = now(), used_by = v_id where id = v_code_id;
  end if;
  return v_id;
end $$;

revoke all on function public.submit_application(jsonb), public.create_invite_code(text), public.application_path_ok(text, text), public.stamp_application() from public, anon;
grant execute on function public.submit_application(jsonb) to anon, authenticated;
grant execute on function public.create_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The private storage bucket for the PDFs (this part only runs on Supabase, where "storage" exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('applications', 'applications', false, 5242880, array['application/pdf'])      -- private, 5 MB, PDF only
    on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

    execute $p$ create policy "anyone can upload an application PDF" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'applications'
        and name ~ '^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(permit|licence|food-permit)\.pdf$') $p$;
    execute $p$ create policy "main admin and associates read application PDFs" on storage.objects for select to authenticated
      using (bucket_id = 'applications' and public.is_team_manager()) $p$;
  end if;
end $$;
