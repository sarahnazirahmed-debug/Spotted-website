-- SPOTTED DASHBOARD NUMBERS (Supabase / Postgres)
-- Run this AFTER schema.sql, admin.sql and public_site.sql.
--
-- These two functions give the /admin/dashboard page the REAL numbers that exist today:
--   sign-ups, Insiders (influencers) joined, reels linked, trials started and ending, and visits (stars).
-- Everything else on the dashboard (notifications, saves, subscribers, money ...) has no real source yet,
-- so the page shows clearly labelled EXAMPLE numbers for it.
--
-- Who may call them: the main admin, associates and staff. A helper, a logged-out visitor and anyone
-- who is not on the team get an error. They return COUNTS ONLY: no money, no names of app users.

-- One row per metric per day. p_country is a two-letter code such as AE, or 'ALL' for worldwide.
create function public.dashboard_real(p_country text default 'ALL', p_days integer default 400)
returns table (metric text, day date, value bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_team_role() is null or public.my_team_role() = 'helper' then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  p_days := least(greatest(coalesce(p_days, 400), 1), 1000);
  return query
    select 'signups'::text, p.created_at::date, count(*)::bigint
      from public.profiles p
      where p.created_at >= current_date - p_days and (p_country = 'ALL' or p.country = p_country)
      group by 2
    union all
    select 'influencers_joined', a.created_at::date, count(*)
      from public.partner_accounts a
      where a.kind = 'influencer' and a.created_at >= current_date - p_days and (p_country = 'ALL' or a.country = p_country)
      group by 2
    union all
    select 'trials_started', a.trial_started_at::date, count(*)
      from public.partner_accounts a
      where a.kind = 'influencer' and a.trial_started_at >= current_date - p_days and (p_country = 'ALL' or a.country = p_country)
      group by 2
    union all
    -- the free 2 months end 2 calendar months after they start (still on trial only)
    select 'trials_ending', (a.trial_started_at + interval '2 months')::date, count(*)
      from public.partner_accounts a
      where a.kind = 'influencer' and a.status = 'trial' and (p_country = 'ALL' or a.country = p_country)
      group by 2
    union all
    select 'reels_linked', r.created_at::date, count(*)
      from public.reels r
      where nullif(trim(r.creator_handle), '') is not null and r.created_at >= current_date - p_days
        and (p_country = 'ALL' or exists (
          select 1 from public.partner_accounts a
          where a.kind = 'influencer' and lower(a.handle) = lower(r.creator_handle) and a.country = p_country))
      group by 2
    union all
    -- visits = purple stars (visited, did not order) + green stars (visited and ordered)
    select 'visits', s.occurred_at::date, count(*)
      from public.stars s
      where s.kind in ('purple', 'green') and s.occurred_at >= current_date - p_days
        and (p_country = 'ALL' or exists (select 1 from public.partner_accounts a where a.id = s.creator_id and a.country = p_country))
      group by 2;
end $$;

-- One row per Insider (influencer): how many reels, visits and saves.
create function public.dashboard_influencers()
returns table (id uuid, name text, handle text, joined date, reels bigint, visits bigint, saves bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_team_role() is null or public.my_team_role() = 'helper' then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  return query
    select a.id, a.business_name, a.handle, a.created_at::date,
      (select count(*) from public.reels r where nullif(trim(a.handle), '') is not null and lower(r.creator_handle) = lower(a.handle)),
      (select count(*) from public.stars s where s.creator_id = a.id and s.kind in ('purple', 'green')),
      (select count(*) from public.stars s where s.creator_id = a.id and s.kind = 'yellow')
    from public.partner_accounts a
    where a.kind = 'influencer'
    order by a.business_name;
end $$;

revoke all on function public.dashboard_real(text, integer), public.dashboard_influencers() from public, anon;
grant execute on function public.dashboard_real(text, integer), public.dashboard_influencers() to authenticated;
