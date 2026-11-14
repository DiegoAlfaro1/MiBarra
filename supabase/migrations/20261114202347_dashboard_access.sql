-- Dashboard sign-in gate (issue #21).
-- Tells the dashboard what the signed-in user may open: one row per active shop
-- membership (owner / manager / barista), plus a 'platform_admin' row with a null
-- shop for platform admins. Customers and signed-out users get no rows, so the
-- dashboard refuses them. Row-level security still protects the data itself.
create function public.dashboard_access()
returns table (shop_id uuid, shop_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.shop_id, s.name, m.role
  from public.shop_members m
  join public.shops s on s.id = m.shop_id
  where m.user_id = (select auth.uid()) and m.active
  union all
  select null::uuid, null::text, 'platform_admin'
  where public.is_platform_admin()
  order by 1 nulls last, 3;
$$;

revoke all on function public.dashboard_access() from public, anon;
grant execute on function public.dashboard_access() to authenticated;
