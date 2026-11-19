-- Order history (#63): a customer reads their own past orders with lines and the personalization snapshot
-- (needed for "Pedir de nuevo"), and nobody else's. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('3a000000-0000-4000-8000-00000000000a', 'ana@test.local', '{}', '{}'),
  ('3a000000-0000-4000-8000-00000000000b', 'beto@test.local', '{}', '{}');

insert into public.shops (id, name, currency, suspended, is_open) values
  ('1a000000-0000-4000-8000-00000000000a', 'Shop', 'HNL', false, true);

insert into public.menu_categories (id, shop_id, name) values
  ('5a000000-0000-4000-8000-00000000000a', '1a000000-0000-4000-8000-00000000000a', 'Café');

insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('6a000000-0000-4000-8000-00000000000a', '1a000000-0000-4000-8000-00000000000a', '5a000000-0000-4000-8000-00000000000a', 'Latte', 6000);

insert into public.orders (id, shop_id, customer_id, status, total_cents, idempotency_key) values
  ('7a000000-0000-4000-8000-00000000000a', '1a000000-0000-4000-8000-00000000000a', '3a000000-0000-4000-8000-00000000000a', 'completed', 14000, gen_random_uuid()),
  ('7a000000-0000-4000-8000-00000000000b', '1a000000-0000-4000-8000-00000000000a', '3a000000-0000-4000-8000-00000000000a', 'cancelled', 6000, gen_random_uuid());

insert into public.order_items (order_id, item_id, quantity, unit_price_cents, chosen_options) values
  ('7a000000-0000-4000-8000-00000000000a', '6a000000-0000-4000-8000-00000000000a', 2, 7000,
    '[{"id":"8a000000-0000-4000-8000-00000000000a","name":"Grande","price_change_cents":1000}]'),
  ('7a000000-0000-4000-8000-00000000000b', '6a000000-0000-4000-8000-00000000000a', 1, 6000, '[]');

-- The owner sees every order, with shop name, item name, quantity, price and personalization
select tests.login('3a000000-0000-4000-8000-00000000000a');
select is((select count(*)::int from public.orders), 2, 'a customer sees all their past orders, cancelled ones too');
select is(
  (select o.total_cents || '|' || s.name || '|' || m.name || '|' || i.quantity || '|' || i.unit_price_cents || '|' || (i.chosen_options -> 0 ->> 'name')
     from public.orders o
     join public.shops s on s.id = o.shop_id
     join public.order_items i on i.order_id = o.id
     join public.menu_items m on m.id = i.item_id
    where o.id = '7a000000-0000-4000-8000-00000000000a'),
  '14000|Shop|Latte|2|7000|Grande',
  'a past order shows what was ordered, the price paid and the chosen options');
select is((select count(*)::int from public.order_items), 2, 'a customer sees the lines of their orders');

-- Other customers and visitors see nothing
select tests.login('3a000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from public.orders), 0, 'another customer sees none of those orders');
select is((select count(*)::int from public.order_items), 0, 'another customer sees none of those lines');

select tests.login_anon();
select is((select count(*)::int from public.orders), 0, 'a visitor sees no orders');

-- History is read-only: lines cannot be edited from the app
select tests.login('3a000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ update public.order_items set quantity = 9 where order_id = '7a000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'a customer cannot change the lines of a past order');

select * from finish();
rollback;
