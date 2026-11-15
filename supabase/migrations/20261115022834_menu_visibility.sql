-- Menu categories and items for customers (#38).
--  1. A suspended shop's menu is hidden from customers and visitors, like the shop itself.
--     Its own staff and platform admins still see it.
--  2. A shop cannot have two categories with the same name (ignoring case and outer spaces).

-- ---------------------------------------------------------------------------
-- 1. Menu reads follow the shop's visibility
-- ---------------------------------------------------------------------------

create function public.menu_visible(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.shops s where s.id = p_shop_id and not s.suspended)
    or public.has_shop_role(p_shop_id)
    or public.is_platform_admin();
$$;

revoke all on function public.menu_visible(uuid) from public;
grant execute on function public.menu_visible(uuid) to anon, authenticated;

drop policy "menu_categories: anyone can read" on public.menu_categories;
create policy "menu_categories: anyone can read visible shops" on public.menu_categories
  for select to anon, authenticated
  using (public.menu_visible(shop_id));

drop policy "menu_items: anyone can read" on public.menu_items;
create policy "menu_items: anyone can read visible shops" on public.menu_items
  for select to anon, authenticated
  using (public.menu_visible(shop_id));

drop policy "item_options: anyone can read" on public.item_options;
create policy "item_options: anyone can read visible shops" on public.item_options
  for select to anon, authenticated
  using (exists (
    select 1 from public.menu_items m
    where m.id = item_id and public.menu_visible(m.shop_id)
  ));

-- ---------------------------------------------------------------------------
-- 2. Category names are unique per shop
-- ---------------------------------------------------------------------------

create unique index menu_categories_shop_name_key
  on public.menu_categories (shop_id, lower(btrim(name)));
