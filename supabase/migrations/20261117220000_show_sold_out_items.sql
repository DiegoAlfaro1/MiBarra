-- Viewing a shop's menu (#52): customers and visitors see sold-out items again, clearly marked as
-- sold out by the app, instead of the item disappearing (replaces the hiding added in #46).
-- Ordering is still blocked on the server: `place_order` only accepts items with `available = true`.
-- Options of a sold-out item are readable again too (the item_options policy follows menu_items).

drop policy "menu_items: anyone can read visible shops" on public.menu_items;
create policy "menu_items: anyone can read visible shops" on public.menu_items
  for select to anon, authenticated
  using (public.menu_visible(shop_id));
