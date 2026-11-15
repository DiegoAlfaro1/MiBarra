-- Sold-out items (#46): customers and visitors only see items that are in stock.
-- Staff of the shop and platform admins still see every item, so the dashboard can mark an item
-- as back in stock. Options of a hidden item are hidden with it (the item_options policy joins menu_items).

drop policy "menu_items: anyone can read visible shops" on public.menu_items;
create policy "menu_items: anyone can read visible shops" on public.menu_items
  for select to anon, authenticated
  using (
    public.menu_visible(shop_id)
    and (available or public.has_shop_role(shop_id) or public.is_platform_admin())
  );
