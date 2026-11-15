-- Issue #39: menu items can vary (sizes and extras, each with a price change).
--
-- item_options already exists (20261114000000_data_model.sql) with owner/manager write policies
-- (20261114100000_access_control.sql) and public reads for visible shops
-- (20261115022834_menu_visibility.sql). This migration adds the rules the dashboard editor and
-- ordering rely on:
--   1. an option name is unique per item and kind (case and outer spaces ignored),
--   2. names cannot be blank and price changes stay within the menu price limit,
--   3. an order line must carry exactly one size when its item has sizes on sale, so a
--      customer can never skip the size (and its price change) or pay for two sizes.

-- ---------------------------------------------------------------------------
-- 1 + 2. Option constraints
-- ---------------------------------------------------------------------------

create unique index item_options_item_kind_name_key
  on public.item_options (item_id, kind, lower(btrim(name)));

alter table public.item_options
  add constraint item_options_name_not_blank check (btrim(name) <> ''),
  -- Same limit as item prices (L 99,999.99), in either direction.
  add constraint item_options_price_change_range check (abs(price_change_cents) <= 9999999);

-- ---------------------------------------------------------------------------
-- 3. One size per order line
-- ---------------------------------------------------------------------------
-- place_order already rejects unknown, sold-out, foreign and duplicated option ids. This trigger
-- runs on every order_items insert (inside place_order's transaction, so a failure creates no
-- order) and checks the size rule against the item's current options.

create function public.check_order_item_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sizes_chosen integer;
begin
  select count(*) into v_sizes_chosen
  from public.item_options o
  where o.item_id = new.item_id
    and o.kind = 'size'
    and o.id::text in (select c ->> 'id' from jsonb_array_elements(new.chosen_options) as c);

  if v_sizes_chosen > 1 then
    raise exception 'Choose only one size for each item.' using errcode = '22023';
  end if;
  if v_sizes_chosen = 0 and exists (
    select 1 from public.item_options o
    where o.item_id = new.item_id and o.kind = 'size' and o.available
  ) then
    raise exception 'Choose a size for each item.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.check_order_item_size() from public, anon, authenticated;

create trigger order_items_check_size
  before insert on public.order_items
  for each row execute function public.check_order_item_size();
