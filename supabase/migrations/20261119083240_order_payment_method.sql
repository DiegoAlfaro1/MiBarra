-- Payment method (#59): the customer chooses how they will pay when they place the order.
--  * `counter` = pay at the counter (the only real payment in the MVP; the order stays
--    payment_status = 'pending', which the dashboard shows as "not paid").
--  * `card`    = demo card flow (mockup); no money moves, so payment_status also stays 'pending'.
-- The method is fixed when the order is created: clients cannot update it afterwards.

alter table public.orders
  add column payment_method text not null default 'counter'
  check (payment_method in ('counter', 'card'));

-- Staff and customers may still only change the order status.
create or replace function public.guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.shop_id <> old.shop_id
     or new.customer_id <> old.customer_id
     or new.total_cents <> old.total_cents
     or new.idempotency_key <> old.idempotency_key
     or new.created_at <> old.created_at
     or new.pickup_time is distinct from old.pickup_time
     or new.note is distinct from old.note
     or new.payment_method <> old.payment_method
     or new.payment_status <> old.payment_status
     or (old.loyalty_awarded_at is not null and new.loyalty_awarded_at is distinct from old.loyalty_awarded_at) then
    raise exception 'Only the order status can be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function public.place_order(uuid, jsonb, uuid, timestamptz, text);

create or replace function public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_idempotency_key uuid,
  p_pickup_time timestamptz default null,
  p_note text default null,
  p_payment_method text default 'counter'
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
  if p_payment_method is null or p_payment_method not in ('counter', 'card') then
    raise exception 'Choose how you want to pay.' using errcode = '22023';
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
    select * into v_shop from public.shops where id = p_shop_id;
    if not public.shop_within_hours(v_shop.hours, v_shop.timezone, p_pickup_time) then
      raise exception 'The shop is closed at that pickup time.' using errcode = '22023';
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

  insert into public.orders (shop_id, customer_id, total_cents, idempotency_key, pickup_time, note, payment_method)
  values (p_shop_id, v_customer, v_total, p_idempotency_key, p_pickup_time, nullif(btrim(p_note), ''), p_payment_method)
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

revoke all on function public.place_order(uuid, jsonb, uuid, timestamptz, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, uuid, timestamptz, text, text) to authenticated;
