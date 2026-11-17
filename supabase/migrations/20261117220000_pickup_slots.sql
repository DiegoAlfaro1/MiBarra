-- Choosing a pickup time (#55).
--  1. Shops get a slot length and a capacity (orders per slot).
--  2. list_pickup_slots() generates today's slots from the shop's hours and capacity.
--  3. place_order() accepts an optional pickup time and refuses times outside the hours or in a full slot.
--     No pickup time means "as soon as possible": the order is prepared right away.

alter table public.shops
  add column slot_minutes integer not null default 10 check (slot_minutes in (5, 10, 15, 20, 30, 60)),
  add column slot_capacity integer not null default 5 check (slot_capacity between 1 and 100);

-- Start of the slot that contains p_at. Slots sit on a fixed grid so every caller agrees on them.
create function public.pickup_slot_start(p_at timestamptz, p_slot_minutes integer)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select to_timestamp(floor(extract(epoch from p_at) / (p_slot_minutes * 60)) * (p_slot_minutes * 60));
$$;

grant execute on function public.pickup_slot_start(timestamptz, integer) to anon, authenticated, service_role;

-- Today's pickup slots for a shop (shop-local day), from now until closing.
-- Customers cannot read other people's orders, so the counts are computed here.
-- A shop that is closed, suspended or has no hours for today has no slots.
create function public.list_pickup_slots(p_shop_id uuid)
returns table (slot_start timestamptz, taken integer, capacity integer, is_full boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop public.shops;
  v_local timestamp;
  v_day jsonb;
  v_open timestamptz;
  v_close timestamptz;
  v_first timestamptz;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found or v_shop.suspended or not v_shop.is_open then
    return;
  end if;
  v_local := now() at time zone v_shop.timezone;
  v_day := v_shop.hours -> (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from v_local)::int + 1];
  if v_day is null or jsonb_typeof(v_day) <> 'object' then
    return;
  end if;
  v_open := (date_trunc('day', v_local) + (v_day ->> 'open')::time) at time zone v_shop.timezone;
  v_close := (date_trunc('day', v_local) + (v_day ->> 'close')::time) at time zone v_shop.timezone;
  -- Leave a few minutes to prepare, then round up to the next slot.
  v_first := public.pickup_slot_start(greatest(v_open, now() + interval '10 minutes') + make_interval(mins => v_shop.slot_minutes - 1), v_shop.slot_minutes);

  return query
  select g.s,
         coalesce(c.n, 0)::integer,
         v_shop.slot_capacity,
         coalesce(c.n, 0) >= v_shop.slot_capacity
  from generate_series(v_first, v_close - make_interval(mins => v_shop.slot_minutes), make_interval(mins => v_shop.slot_minutes)) as g(s)
  left join lateral (
    select count(*) as n from public.orders o
    where o.shop_id = p_shop_id and o.status <> 'cancelled'
      and o.pickup_time >= g.s and o.pickup_time < g.s + make_interval(mins => v_shop.slot_minutes)
  ) c on true
  order by g.s;
end;
$$;

revoke all on function public.list_pickup_slots(uuid) from public;
grant execute on function public.list_pickup_slots(uuid) to anon, authenticated, service_role;

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
  v_shop public.shops;
  v_slot timestamptz;
  v_taken integer;
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
  if p_pickup_time is not null then
    -- Lock the shop so two customers cannot both take the last place in a slot.
    select * into v_shop from public.shops where id = p_shop_id for update;
    if not public.shop_within_hours(v_shop.hours, v_shop.timezone, p_pickup_time) then
      raise exception 'The shop is closed at that pickup time.' using errcode = '22023';
    end if;
    v_slot := public.pickup_slot_start(p_pickup_time, v_shop.slot_minutes);
    select count(*) into v_taken from public.orders o
    where o.shop_id = p_shop_id and o.status <> 'cancelled'
      and o.pickup_time >= v_slot and o.pickup_time < v_slot + make_interval(mins => v_shop.slot_minutes);
    if v_taken >= v_shop.slot_capacity then
      raise exception 'That pickup time is full.' using errcode = '22023';
    end if;
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
