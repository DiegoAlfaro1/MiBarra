-- MiBarra MVP data model (issue #19).
-- Evolves the initial schema into the eight documented tables:
--   shops, menu_categories, menu_items, item_options, customers,
--   orders, order_items, loyalty_cards
-- (plus shop_staff, which maps logins to the shops they work at).
-- Money stays as integer cents (HNL by default). RLS stays enabled on every table.
-- See docs/data-model.md.

-- ---------------------------------------------------------------------------
-- customers (was profiles): app users, linked 1:1 to the login (auth.users)
-- ---------------------------------------------------------------------------

alter table public.profiles rename to customers;
alter table public.customers rename column display_name to name;
alter table public.customers
  add column phone text check (phone is null or char_length(phone) between 6 and 20),
  add column email text check (email is null or char_length(email) <= 254);

update public.customers c
set email = u.email, phone = nullif(u.phone, '')
from auth.users u
where u.id = c.id;

alter table public.customers
  add constraint customers_contact_check check (phone is not null or email is not null),
  add constraint customers_email_key unique (email),
  add constraint customers_phone_key unique (phone);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (id, name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    nullif(new.email, ''),
    nullif(new.phone, '')
  );
  return new;
end;
$$;

drop policy "profiles: owner can read" on public.customers;
drop policy "profiles: owner can update" on public.customers;

-- Customers read and edit only their own row; staff can read customers who ordered at their shop.
create policy "customers: owner or shop staff can read" on public.customers
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.orders o
      where o.customer_id = customers.id and public.is_shop_staff(o.shop_id)
    )
  );
create policy "customers: owner can update" on public.customers
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- shops: add profile, hours, payment provider and loyalty rule
-- ---------------------------------------------------------------------------

alter table public.shops
  add column logo_url text,
  add column address text check (address is null or char_length(address) <= 240),
  -- Weekly opening hours, e.g. {"mon": {"open": "07:00", "close": "19:00"}, "sun": null}.
  add column hours jsonb not null default '{}'::jsonb check (jsonb_typeof(hours) = 'object'),
  -- Manual open/closed switch the owner controls; closed shops reject new orders.
  add column is_open boolean not null default true,
  add column payment_provider text not null default 'cash'
    check (payment_provider in ('cash', 'stripe', 'paypal', 'other')),
  -- Loyalty rule: a reward every N completed orders (null = no loyalty program).
  add column loyalty_stamps_required integer check (loyalty_stamps_required is null or loyalty_stamps_required >= 1),
  add column loyalty_reward text check (loyalty_reward is null or char_length(loyalty_reward) <= 120);

alter table public.shops alter column currency set default 'HNL';

-- ---------------------------------------------------------------------------
-- menu_categories (new) and menu_items (was products)
-- ---------------------------------------------------------------------------

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Lets menu_items prove its category belongs to the same shop.
  unique (id, shop_id)
);
create index menu_categories_shop_sort_idx on public.menu_categories (shop_id, sort_order);

alter table public.products rename to menu_items;
alter table public.menu_items rename column is_available to available;
alter index products_shop_id_idx rename to menu_items_shop_id_idx;

alter table public.menu_items
  add column category_id uuid,
  add column description text check (description is null or char_length(description) <= 500),
  add column photo_url text;

-- Existing items go into a "General" category per shop.
insert into public.menu_categories (shop_id, name)
select distinct shop_id, 'General' from public.menu_items;

update public.menu_items m
set category_id = c.id
from public.menu_categories c
where c.shop_id = m.shop_id and c.name = 'General';

alter table public.menu_items
  alter column category_id set not null,
  add constraint menu_items_category_fkey
    foreign key (category_id, shop_id) references public.menu_categories (id, shop_id) on delete restrict;
create index menu_items_category_id_idx on public.menu_items (category_id);

drop policy "products: anyone can read" on public.menu_items;
drop policy "products: owner can insert" on public.menu_items;
drop policy "products: owner can update" on public.menu_items;
drop policy "products: owner can delete" on public.menu_items;

-- ---------------------------------------------------------------------------
-- item_options (new): sizes and extras for a menu item
-- ---------------------------------------------------------------------------

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items (id) on delete cascade,
  kind text not null default 'extra' check (kind in ('size', 'extra')),
  name text not null check (char_length(name) between 1 and 80),
  -- Added to the item's price; may be negative for a discount. Zero for the default size.
  price_change_cents integer not null default 0,
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create index item_options_item_id_idx on public.item_options (item_id);

-- ---------------------------------------------------------------------------
-- orders: pickup time, payment status, note, loyalty guard
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders
  add constraint orders_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete restrict;

alter table public.orders
  add column pickup_time timestamptz,
  add column payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column note text check (note is null or char_length(note) <= 280),
  -- Set once when loyalty stamps are awarded, so a retry or status flip-flop never double counts.
  add column loyalty_awarded_at timestamptz;

-- ---------------------------------------------------------------------------
-- order_items: item reference, chosen options, price snapshot
-- ---------------------------------------------------------------------------

alter table public.order_items rename column product_id to item_id;
alter table public.order_items
  -- Snapshot of the chosen options: [{ "id", "name", "price_change_cents" }, ...]
  add column chosen_options jsonb not null default '[]'::jsonb check (jsonb_typeof(chosen_options) = 'array');
comment on column public.order_items.unit_price_cents is
  'Price of one unit at order time, including chosen options. Never recomputed from the menu.';

-- ---------------------------------------------------------------------------
-- loyalty_cards (new, replaces loyalty_ledger): one per customer per shop
-- ---------------------------------------------------------------------------

drop view public.loyalty_balances;
drop table public.loyalty_ledger;

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  stamps integer not null default 0 check (stamps >= 0),
  rewards_available integer not null default 0 check (rewards_available >= 0),
  -- Unguessable value shown as a QR code for staff to scan.
  qr_code_value text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, shop_id)
);
create index loyalty_cards_shop_id_idx on public.loyalty_cards (shop_id);

create trigger loyalty_cards_set_updated_at
  before update on public.loyalty_cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Triggers & functions
-- ---------------------------------------------------------------------------

-- Staff may only change an order's status. Server-side code with no signed-in
-- user (service role, e.g. payment webhooks) may update payment_status too.
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
     or new.payment_status <> old.payment_status
     or (old.loyalty_awarded_at is not null and new.loyalty_awarded_at is distinct from old.loyalty_awarded_at) then
    raise exception 'Only the order status can be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Defence in depth: signed-in clients can only ever update orders.status.
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;

-- Awards one loyalty stamp when an order is completed. The conditional update of
-- loyalty_awarded_at makes it exactly-once, even if status changes repeatedly.
create function public.award_loyalty_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required integer;
  v_claimed uuid;
begin
  select loyalty_stamps_required into v_required from public.shops where id = new.shop_id;
  if v_required is null then
    return new;
  end if;

  update public.orders
  set loyalty_awarded_at = now()
  where id = new.id and loyalty_awarded_at is null
  returning id into v_claimed;
  if v_claimed is null then
    return new;
  end if;

  insert into public.loyalty_cards (customer_id, shop_id, stamps, rewards_available)
  values (new.customer_id, new.shop_id, 1 % v_required, 1 / v_required)
  on conflict (customer_id, shop_id) do update
  set stamps = (public.loyalty_cards.stamps + 1) % v_required,
      rewards_available = public.loyalty_cards.rewards_available
        + (public.loyalty_cards.stamps + 1) / v_required;
  return new;
end;
$$;

create trigger orders_award_loyalty
  after update of status on public.orders
  for each row
  when (new.status = 'completed' and old.status <> 'completed')
  execute function public.award_loyalty_stamp();

-- ---------------------------------------------------------------------------
-- place_order: now checks the shop is open, prices chosen options from the menu,
-- and stores pickup time and note. Still idempotent per (customer, idempotency_key).
-- p_items: [{ "productId": uuid, "quantity": int, "optionIds": [uuid, ...]? }, ...]
-- ---------------------------------------------------------------------------

drop function public.place_order(uuid, jsonb, uuid);

create function public.place_order(
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
  if not exists (select 1 from public.shops where id = p_shop_id and is_open) then
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

revoke all on function public.place_order(uuid, jsonb, uuid, timestamptz, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, uuid, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security for the new and renamed tables
-- ---------------------------------------------------------------------------

alter table public.menu_categories enable row level security;
alter table public.item_options enable row level security;
alter table public.loyalty_cards enable row level security;

-- Public menu; only shop owners edit it.
create policy "menu_categories: anyone can read" on public.menu_categories
  for select to anon, authenticated using (true);
create policy "menu_categories: owner can insert" on public.menu_categories
  for insert to authenticated with check (public.is_shop_staff(shop_id, array['owner']));
create policy "menu_categories: owner can update" on public.menu_categories
  for update to authenticated
  using (public.is_shop_staff(shop_id, array['owner'])) with check (public.is_shop_staff(shop_id, array['owner']));
create policy "menu_categories: owner can delete" on public.menu_categories
  for delete to authenticated using (public.is_shop_staff(shop_id, array['owner']));

create policy "menu_items: anyone can read" on public.menu_items
  for select to anon, authenticated using (true);
create policy "menu_items: owner can insert" on public.menu_items
  for insert to authenticated with check (public.is_shop_staff(shop_id, array['owner']));
create policy "menu_items: owner can update" on public.menu_items
  for update to authenticated
  using (public.is_shop_staff(shop_id, array['owner'])) with check (public.is_shop_staff(shop_id, array['owner']));
create policy "menu_items: owner can delete" on public.menu_items
  for delete to authenticated using (public.is_shop_staff(shop_id, array['owner']));

create policy "item_options: anyone can read" on public.item_options
  for select to anon, authenticated using (true);
create policy "item_options: owner can insert" on public.item_options
  for insert to authenticated
  with check (exists (
    select 1 from public.menu_items m
    where m.id = item_id and public.is_shop_staff(m.shop_id, array['owner'])
  ));
create policy "item_options: owner can update" on public.item_options
  for update to authenticated
  using (exists (
    select 1 from public.menu_items m
    where m.id = item_id and public.is_shop_staff(m.shop_id, array['owner'])
  ))
  with check (exists (
    select 1 from public.menu_items m
    where m.id = item_id and public.is_shop_staff(m.shop_id, array['owner'])
  ));
create policy "item_options: owner can delete" on public.item_options
  for delete to authenticated
  using (exists (
    select 1 from public.menu_items m
    where m.id = item_id and public.is_shop_staff(m.shop_id, array['owner'])
  ));

-- Loyalty cards are read-only for clients; stamps are awarded by award_loyalty_stamp().
create policy "loyalty_cards: customer or staff can read" on public.loyalty_cards
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_shop_staff(shop_id));
