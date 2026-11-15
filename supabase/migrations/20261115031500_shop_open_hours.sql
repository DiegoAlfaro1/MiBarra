-- Shops can open or close (#48).
--  1. Shops get a timezone so working hours mean the shop's local time.
--  2. Orders are refused when the shop is switched off OR outside its working hours.
--  3. The switch cannot be turned on outside working hours.
--  4. close_shops_outside_hours() flips the stored switch off once hours end (runs every minute via pg_cron when available).

alter table public.shops
  add column timezone text not null default 'America/Tegucigalpa';

-- True when p_at falls inside the shop's hours for that local weekday.
-- A shop with no schedule at all has no hour limits.
create function public.shop_within_hours(p_hours jsonb, p_timezone text, p_at timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  with local as (select p_at at time zone p_timezone as t),
  d as (
    select (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from t)::int + 1] as k,
           t::time as tm
    from local
  )
  select case
    when p_hours is null
      or not exists (select 1 from jsonb_each(p_hours) e where jsonb_typeof(e.value) = 'object')
      then true
    else coalesce(
      (select jsonb_typeof(p_hours -> d.k) = 'object'
          and d.tm >= (p_hours -> d.k ->> 'open')::time
          and d.tm < (p_hours -> d.k ->> 'close')::time
       from d),
      false)
  end;
$$;

revoke all on function public.shop_within_hours(jsonb, text, timestamptz) from public;
grant execute on function public.shop_within_hours(jsonb, text, timestamptz) to anon, authenticated, service_role;

-- Owners and managers cannot switch ordering on outside the shop's working hours.
create or replace function public.set_shop_open(p_shop_id uuid, p_open boolean)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop public.shops;
begin
  perform public.require_shop_role(p_shop_id, array['owner', 'manager']);
  if p_open is null then
    raise exception 'Choose open or closed.' using errcode = '22023';
  end if;
  select * into v_shop from public.shops where id = p_shop_id for update;
  if p_open and v_shop.suspended then
    raise exception 'This shop is suspended. Contact support to reopen it.' using errcode = '42501';
  end if;
  if p_open and not public.shop_within_hours(v_shop.hours, v_shop.timezone) then
    raise exception 'You can only open the shop during its working hours.' using errcode = '22023';
  end if;
  update public.shops set is_open = p_open where id = p_shop_id returning * into v_shop;
  return v_shop;
end;
$$;

-- Switches off every shop whose hours have ended. Server only.
create function public.close_shops_outside_hours()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.shops s set is_open = false
  where s.is_open and not public.shop_within_hours(s.hours, s.timezone);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.close_shops_outside_hours() from public, anon, authenticated;
grant execute on function public.close_shops_outside_hours() to service_role;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('close-shops-outside-hours', '* * * * *', 'select public.close_shops_outside_hours()');
exception when others then
  raise notice 'pg_cron not available; call close_shops_outside_hours() from a scheduler.';
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order: same as before, but the shop must be open, not suspended and inside its hours.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_idempotency_key uuid,
  p_pickup_time timestamptz default null,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid := (select auth.uid());
  v_order public.orders;
  v_row record;
  v_item record;
  v_option_count integer;
  v_option_delta integer;
  v_chosen jsonb;
  v_unit integer;
  v_total integer := 0;
  v_lines jsonb := '[]'::jsonb;
begin
  if v_customer is null then
    raise exception 'You need to sign in to place an order.' using errcode = '28000';
  end if;
  if p_idempotency_key is null then
    raise exception 'Missing order reference.' using errcode = '22023';
  end if;

  -- Replay: same customer + key returns the original order.
  select * into v_order from public.orders
  where customer_id = v_customer and idempotency_key = p_idempotency_key;
  if found then
    return v_order;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order.' using errcode = '22023';
  end if;
  if p_pickup_time is not null and p_pickup_time < now() - interval '1 minute' then
    raise exception 'Pickup time must be in the future.' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'The note is too long.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.shops s
    where s.id = p_shop_id and s.is_open and not s.suspended
      and public.shop_within_hours(s.hours, s.timezone)
  ) then
    raise exception 'This shop is closed right now.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i("productId" uuid, quantity integer)
    where i."productId" is null or i.quantity is null or i.quantity not between 1 and 99
  ) then
    raise exception 'Each item needs a product and a quantity between 1 and 99.' using errcode = '22023';
  end if;

  for v_row in
    select i."productId" as item_id, i.quantity, coalesce(i."optionIds", '[]'::jsonb) as option_ids
    from jsonb_to_recordset(p_items) as i("productId" uuid, quantity integer, "optionIds" jsonb)
  loop
    select m.price_cents into v_item
    from public.menu_items m
    where m.id = v_row.item_id and m.shop_id = p_shop_id and m.available;
    if not found then
      raise exception 'One or more products are not available at this shop.' using errcode = '22023';
    end if;

    if jsonb_typeof(v_row.option_ids) <> 'array' then
      raise exception 'Invalid options.' using errcode = '22023';
    end if;
    select count(*), coalesce(sum(o.price_change_cents), 0),
           coalesce(jsonb_agg(jsonb_build_object(
             'id', o.id, 'name', o.name, 'price_change_cents', o.price_change_cents)), '[]'::jsonb)
      into v_option_count, v_option_delta, v_chosen
    from public.item_options o
    where o.item_id = v_row.item_id
      and o.available
      and o.id in (select jsonb_array_elements_text(v_row.option_ids)::uuid);
    -- Unknown, unavailable, foreign or duplicated option ids all fail this check.
    if v_option_count <> jsonb_array_length(v_row.option_ids) then
      raise exception 'One or more options are not available.' using errcode = '22023';
    end if;

    v_unit := v_item.price_cents + v_option_delta;
    if v_unit < 0 then
      raise exception 'Invalid item price.' using errcode = '22023';
    end if;
    v_total := v_total + v_unit * v_row.quantity;
    v_lines := v_lines || jsonb_build_object(
      'item_id', v_row.item_id, 'quantity', v_row.quantity,
      'unit_price_cents', v_unit, 'chosen_options', v_chosen);
  end loop;

  insert into public.orders (shop_id, customer_id, total_cents, idempotency_key, pickup_time, note)
  values (p_shop_id, v_customer, v_total, p_idempotency_key, p_pickup_time, nullif(btrim(p_note), ''))
  on conflict (customer_id, idempotency_key) do nothing
  returning * into v_order;

  if v_order.id is null then
    -- A concurrent retry won the race; return its order.
    select * into v_order from public.orders
    where customer_id = v_customer and idempotency_key = p_idempotency_key;
    return v_order;
  end if;

  insert into public.order_items (order_id, item_id, quantity, unit_price_cents, chosen_options)
  select v_order.id, l.item_id, l.quantity, l.unit_price_cents, l.chosen_options
  from jsonb_to_recordset(v_lines)
    as l(item_id uuid, quantity integer, unit_price_cents integer, chosen_options jsonb);

  return v_order;
end;
$$;
