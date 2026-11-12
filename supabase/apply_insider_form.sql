-- SPOTTED: THE 7-STEP INSIDER APPLICATION (Supabase / Postgres)
--
-- Run this AFTER applications.sql. It is a new file; the older SQL files are not changed.
-- How to use: Supabase > SQL Editor > New query > paste this whole file > Run (once).
--
-- WHAT IT DOES, in plain words:
--   * The applications table gets room for the new answers: solo creator or agency, first / middle / last name, gender,
--     company name, country (always UAE), the contact person of an agency, three emails and which of them were verified,
--     phone, WhatsApp, backup phone, landline, and a list of Instagram accounts.
--   * A new database function, submit_insider_application, is the ONE way an Insider application comes in. It checks every rule
--     again (the website's checks are only friendly messages) and saves the application with the status "New" (pending).
--   * The old function submit_application stays: the Partner form still uses it.
--   * "verified" flags say what the browser told us. The team checks every application by hand before approving it.

alter table public.applications
  add column applicant_type          text check (applicant_type in ('solo', 'agency')),
  add column first_name              text check (char_length(first_name) <= 80),
  add column middle_name             text check (char_length(middle_name) <= 80),
  add column last_name               text check (char_length(last_name) <= 80),
  add column gender                  text check (gender in ('female', 'male', 'none')),
  add column company_name            text check (char_length(company_name) <= 160),
  add column country                 text check (country = 'UAE'),
  add column contact_first_name      text check (char_length(contact_first_name) <= 80),
  add column contact_last_name       text check (char_length(contact_last_name) <= 80),
  add column contact_dob             date,
  add column personal_email          text check (personal_email = lower(personal_email) and char_length(personal_email) <= 254),
  add column backup_email            text check (backup_email = lower(backup_email) and char_length(backup_email) <= 254),
  add column email_verified          boolean not null default false,
  add column personal_email_verified boolean not null default false,
  add column backup_email_verified   boolean not null default false,
  add column whatsapp                text check (char_length(whatsapp) <= 40),
  add column whatsapp_same_as_phone  boolean not null default false,
  add column backup_phone            text check (char_length(backup_phone) <= 40),
  add column landline                text check (char_length(landline) <= 40),
  add column phone_verified          boolean not null default false,
  add column whatsapp_verified       boolean not null default false,
  add column instagram_accounts      jsonb not null default '[]'::jsonb check (jsonb_typeof(instagram_accounts) = 'array' and jsonb_array_length(instagram_accounts) <= 10);

create function public.submit_insider_application(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_type    text := p ->> 'applicant_type';
  v_join    text := coalesce(p ->> 'join_type', 'regular');
  v_first   text := nullif(btrim(coalesce(p ->> 'first_name', '')), '');
  v_last    text := nullif(btrim(coalesce(p ->> 'last_name', '')), '');
  v_company text := nullif(btrim(coalesce(p ->> 'company_name', '')), '');
  v_cfirst  text := nullif(btrim(coalesce(p ->> 'contact_first_name', '')), '');
  v_clast   text := nullif(btrim(coalesce(p ->> 'contact_last_name', '')), '');
  v_email   text := lower(nullif(btrim(coalesce(p ->> 'email', '')), ''));
  v_phone   text := nullif(btrim(coalesce(p ->> 'phone', '')), '');
  v_emirate text := p ->> 'emirate';
  v_dob     date;
  v_cdob    date;
  v_accounts jsonb := coalesce(p -> 'instagram_accounts', '[]'::jsonb);
  v_tiktok  text := nullif(btrim(coalesce(p ->> 'tiktok', '')), '');
  v_code_id uuid;
  v_name    text;
  v_id      uuid;
  a         jsonb;
begin
  if coalesce(p ->> 'accepted_terms', '') <> 'true' or coalesce(p ->> 'accepted_privacy', '') <> 'true'
     or coalesce(p ->> 'accepted_confidentiality', '') <> 'true' then
    raise exception 'APPLY: Please tick all three boxes before you send.';
  end if;
  if v_join not in ('regular', 'founding') then raise exception 'APPLY: Please choose how you are joining.'; end if;
  if v_type not in ('solo', 'agency') then raise exception 'APPLY: Please choose solo creator, or marketing agency or company.'; end if;
  if v_emirate is null or v_emirate not in ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah') then
    raise exception 'APPLY: Please choose the emirate.';
  end if;

  begin v_dob := nullif(p ->> 'date_of_birth', '')::date; exception when others then v_dob := null; end;
  begin v_cdob := nullif(p ->> 'contact_dob', '')::date; exception when others then v_cdob := null; end;
  if v_type = 'solo' then
    if v_first is null or v_last is null then raise exception 'APPLY: Please tell us your first and last name.'; end if;
    if v_dob is null then raise exception 'APPLY: Please enter your date of birth.'; end if;
    if v_dob > current_date or extract(year from age(current_date, v_dob)) < 18 then raise exception 'APPLY: You must be 18 or over to apply.'; end if;
    if coalesce(p ->> 'gender', 'none') not in ('female', 'male', 'none') then raise exception 'APPLY: Please choose a gender option.'; end if;
    v_name := concat_ws(' ', v_first, nullif(btrim(coalesce(p ->> 'middle_name', '')), ''), v_last);
    if jsonb_array_length(v_accounts) > 1 then raise exception 'APPLY: A solo creator adds one Instagram account.'; end if;
  else
    if v_company is null then raise exception 'APPLY: Please enter the company name.'; end if;
    if v_cfirst is null or v_clast is null then raise exception 'APPLY: Please tell us the contact person''s first and last name.'; end if;
    if v_cdob is null then raise exception 'APPLY: Please enter the contact person''s date of birth.'; end if;
    if v_cdob > current_date or extract(year from age(current_date, v_cdob)) < 18 then raise exception 'APPLY: The contact person must be 18 or over.'; end if;
    v_name := v_company;
  end if;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'APPLY: Please enter a valid business email.'; end if;
  if coalesce(p ->> 'email_verified', '') <> 'true' then raise exception 'APPLY: Please verify the business email with the code we send you.'; end if;
  if v_phone is null then raise exception 'APPLY: Please enter your phone number.'; end if;

  -- social accounts: at least one Instagram (link and handle) or a TikTok handle
  if jsonb_array_length(v_accounts) > 10 then raise exception 'APPLY: You can add up to 10 Instagram accounts.'; end if;
  for a in select * from jsonb_array_elements(v_accounts) loop
    if coalesce(a ->> 'link', '') !~* '^https?://[^\s/]+\.[^\s]{2,}$' or coalesce(a ->> 'handle', '') !~ '^[a-z0-9._]{1,30}$' then
      raise exception 'APPLY: Each Instagram account needs a profile link and a handle.';
    end if;
  end loop;
  if jsonb_array_length(v_accounts) = 0 and v_tiktok is null then raise exception 'APPLY: Please add an Instagram account or a TikTok handle.'; end if;

  if not public.application_path_ok(p ->> 'advertiser_permit_path', 'permit') then raise exception 'APPLY: Please upload your UAE Advertiser Permit (PDF).'; end if;
  if v_type = 'agency' and not public.application_path_ok(p ->> 'trade_licence_path', 'licence') then raise exception 'APPLY: Please upload your UAE trade licence (PDF).'; end if;
  if nullif(p ->> 'trade_licence_path', '') is not null and not public.application_path_ok(p ->> 'trade_licence_path', 'licence') then
    raise exception 'APPLY: The trade licence file did not upload. Please try again.';
  end if;

  if v_join = 'founding' then
    select id into v_code_id from public.invite_codes where code = upper(btrim(coalesce(p ->> 'invite_code', ''))) and used_at is null for update;
    if v_code_id is null then raise exception 'APPLY: That invite code is not valid, or it has already been used.'; end if;
  end if;

  insert into public.applications (
    kind, contact_name, email, phone, instagram, join_type, invite_code_id, date_of_birth, profile_link, tiktok, youtube_link, snapchat,
    other_platform_name, other_platform_link, emirate, advertiser_permit_path, trade_licence_path,
    accepted_terms_at, accepted_privacy_at, accepted_confidentiality_at,
    applicant_type, first_name, middle_name, last_name, gender, company_name, country, contact_first_name, contact_last_name, contact_dob,
    personal_email, backup_email, email_verified, personal_email_verified, backup_email_verified,
    whatsapp, whatsapp_same_as_phone, backup_phone, landline, phone_verified, whatsapp_verified, instagram_accounts
  ) values (
    'insider', left(v_name, 120), v_email, left(v_phone, 40), left(v_accounts -> 0 ->> 'handle', 60), v_join, v_code_id,
    case when v_type = 'solo' then v_dob else v_cdob end,
    left(v_accounts -> 0 ->> 'link', 500), left(v_tiktok, 60),
    left(nullif(btrim(coalesce(p ->> 'youtube_link', '')), ''), 500), left(nullif(btrim(coalesce(p ->> 'snapchat', '')), ''), 60),
    left(nullif(btrim(coalesce(p ->> 'other_platform_name', '')), ''), 80), left(nullif(btrim(coalesce(p ->> 'other_platform_link', '')), ''), 500),
    v_emirate, p ->> 'advertiser_permit_path', nullif(p ->> 'trade_licence_path', ''),
    now(), now(), now(),
    v_type, left(v_first, 80), left(nullif(btrim(coalesce(p ->> 'middle_name', '')), ''), 80), left(v_last, 80),
    case when v_type = 'solo' then coalesce(p ->> 'gender', 'none') end, left(v_company, 160), 'UAE',
    left(v_cfirst, 80), left(v_clast, 80), v_cdob,
    lower(left(nullif(btrim(coalesce(p ->> 'personal_email', '')), ''), 254)), lower(left(nullif(btrim(coalesce(p ->> 'backup_email', '')), ''), 254)),
    true, coalesce(p ->> 'personal_email_verified', '') = 'true', coalesce(p ->> 'backup_email_verified', '') = 'true',
    left(nullif(btrim(coalesce(p ->> 'whatsapp', '')), ''), 40), coalesce(p ->> 'whatsapp_same_as_phone', '') = 'true',
    left(nullif(btrim(coalesce(p ->> 'backup_phone', '')), ''), 40), left(nullif(btrim(coalesce(p ->> 'landline', '')), ''), 40),
    coalesce(p ->> 'phone_verified', '') = 'true', coalesce(p ->> 'whatsapp_verified', '') = 'true', v_accounts
  ) returning id into v_id;

  if v_code_id is not null then update public.invite_codes set used_at = now(), used_by = v_id where id = v_code_id; end if;
  return v_id;
end $$;
revoke all on function public.submit_insider_application(jsonb) from public, anon;
grant execute on function public.submit_insider_application(jsonb) to anon, authenticated;

-- TO UNDO (do not run unless you really want to remove these fields and the new function):
--   drop function public.submit_insider_application(jsonb);
--   alter table public.applications drop column applicant_type, drop column first_name, drop column middle_name, drop column last_name,
--     drop column gender, drop column company_name, drop column country, drop column contact_first_name, drop column contact_last_name,
--     drop column contact_dob, drop column personal_email, drop column backup_email, drop column email_verified,
--     drop column personal_email_verified, drop column backup_email_verified, drop column whatsapp, drop column whatsapp_same_as_phone,
--     drop column backup_phone, drop column landline, drop column phone_verified, drop column whatsapp_verified, drop column instagram_accounts;
