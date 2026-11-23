-- Apply after dashboards.sql. Keep member ownership separate from team access.
begin;

alter policy "team reads items" on public.partner_items
  using (public.my_team_role() in ('main_admin', 'associate', 'staff'));

alter policy "team reads offers" on public.partner_offers
  using (public.my_team_role() in ('main_admin', 'associate', 'staff'));

alter policy "my reels: read" on public.insider_reels
  using (member_id = public.my_member_id('insider')
         or public.my_team_role() in ('main_admin', 'associate', 'staff'));

alter policy "team checks reels" on public.insider_reels
  using (public.my_team_role() in ('main_admin', 'associate', 'staff'))
  with check (public.my_team_role() in ('main_admin', 'associate', 'staff'));

commit;
