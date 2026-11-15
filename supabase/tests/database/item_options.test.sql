-- Sizes and extras (#39): owners and managers create, change and delete an item's options, baristas
-- and customers cannot, and nobody touches another shop's options. Option names are unique per item
-- and kind. place_order prices every line with its options and requires exactly one size when the
-- item has sizes on sale. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('39000000-0000-4000-8000-00000000000a', 'owner-a@test.local', '{"account_type":"staff"}', '{}'),
  ('39000000-0000-4000-8000-00000000000b', 'manager-a@test.local', '{"account_type":"staff"}', '{}'),
  ('39000000-0000-4000-8000-00000000000c', 'barista-a@test.local', '{"account_type":"staff"}', '{}'),
  ('39000000-0000-4000-8000-00000000000d', 'owner-b@test.local', '{"account_type":"staff"}', '{}'),
  ('39000000-0000-4000-8000-00000000000e', 'customer@test.local', '{}', '{}');

insert into public.shops (id, name, currency, is_open) values
  ('19000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL', true),
  ('19000000-0000-4000-8000-00000000000b', 'Shop B', 'HNL', true);

insert into public.shop_members (shop_id, user_id, role, active) values
  ('19000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-00000000000a', 'owner', true),
  ('19000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-00000000000b', 'manager', true),
  ('19000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-00000000000c', 'barista', true),
  ('19000000-0000-4000-8000-00000000000b', '39000000-0000-4000-8000-00000000000d', 'owner', true);

insert into public.menu_categories (id, shop_id, name) values
  ('59000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', 'Café'),
  ('59000000-0000-4000-8000-00000000000b', '19000000-0000-4000-8000-00000000000b', 'Café');

insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  -- Latte has sizes and an extra; Muffin has no options; Mocha belongs to shop B.
  ('69000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-00000000000a', 'Latte', 6000),
  ('69000000-0000-4000-8000-00000000000b', '19000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-00000000000a', 'Muffin', 3000),
  ('69000000-0000-4000-8000-00000000000c', '19000000-0000-4000-8000-00000000000b', '59000000-0000-4000-8000-00000000000b', 'Mocha', 7000);

insert into public.item_options (id, item_id, kind, name, price_change_cents, available) values
  ('79000000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-00000000000a', 'size', 'Pequeño', 0, true),
  ('79000000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-00000000000a', 'size', 'Grande', 1500, true),
  ('79000000-0000-4000-8000-000000000003', '69000000-0000-4000-8000-00000000000a', 'extra', 'Vainilla', 1000, true),
  ('79000000-0000-4000-8000-000000000004', '69000000-0000-4000-8000-00000000000a', 'size', 'Mediano', 800, false),
  ('79000000-0000-4000-8000-000000000005', '69000000-0000-4000-8000-00000000000c', 'size', 'Grande', 1500, true);

-- ---------------------------------------------------------------------------
-- Owner of shop A
-- ---------------------------------------------------------------------------

select tests.login('39000000-0000-4000-8000-00000000000a');

select lives_ok($$ insert into public.item_options (id, item_id, kind, name, price_change_cents) values
  ('79000000-0000-4000-8000-000000000010', '69000000-0000-4000-8000-00000000000a', 'extra', 'Leche de avena', 1200) $$,
  'an owner can add an extra to an item');
select lives_ok($$ update public.item_options set price_change_cents = 1200 where id = '79000000-0000-4000-8000-000000000003' $$,
  'an owner can change an option price');
select lives_ok($$ delete from public.item_options where id = '79000000-0000-4000-8000-000000000010' $$,
  'an owner can delete an option');
select throws_ok($$ insert into public.item_options (item_id, kind, name) values
  ('69000000-0000-4000-8000-00000000000a', 'size', ' grande ') $$,
  '23505', null, 'an item cannot have two sizes with the same name');
select lives_ok($$ insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', 'Grande', 0) $$,
  'a size and an extra may share a name');
select throws_ok($$ insert into public.item_options (item_id, kind, name) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', '   ') $$,
  '23514', null, 'an option name cannot be blank');
select throws_ok($$ insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', 'Oro', 10000000) $$,
  '23514', null, 'an option price change cannot exceed the price limit');
select throws_ok($$ insert into public.item_options (item_id, kind, name) values
  ('69000000-0000-4000-8000-00000000000c', 'extra', 'Canela') $$,
  '42501', null, 'an owner cannot add options to another shop''s item');
select lives_ok($$ update public.item_options set price_change_cents = 0 where id = '79000000-0000-4000-8000-000000000005' $$,
  'an update to another shop''s option runs but changes nothing');

-- ---------------------------------------------------------------------------
-- Manager, barista and customer
-- ---------------------------------------------------------------------------

select tests.login('39000000-0000-4000-8000-00000000000b');
select lives_ok($$ insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', 'Shot extra', 1500) $$,
  'a manager can add an option');

select tests.login('39000000-0000-4000-8000-00000000000c');
select throws_ok($$ insert into public.item_options (item_id, kind, name) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', 'Canela') $$,
  '42501', null, 'a barista cannot add options');
select lives_ok($$ update public.item_options set price_change_cents = 0 where id = '79000000-0000-4000-8000-000000000002' $$,
  'a barista price update runs but changes nothing');
select lives_ok($$ delete from public.item_options where id = '79000000-0000-4000-8000-000000000002' $$,
  'a barista delete runs but removes nothing');

select tests.login('39000000-0000-4000-8000-00000000000e');
select throws_ok($$ insert into public.item_options (item_id, kind, name) values
  ('69000000-0000-4000-8000-00000000000a', 'extra', 'Canela') $$,
  '42501', null, 'a customer cannot add options');

select tests.logout();
select is((select price_change_cents from public.item_options where id = '79000000-0000-4000-8000-000000000005'), 1500,
  'another shop''s option keeps its price');
select is((select price_change_cents from public.item_options where id = '79000000-0000-4000-8000-000000000002'), 1500,
  'a barista did not change or delete the option');
select is((select count(*)::int from public.item_options where id = '79000000-0000-4000-8000-000000000010'), 0,
  'the deleted option is gone');

-- ---------------------------------------------------------------------------
-- Ordering with options (customer)
-- ---------------------------------------------------------------------------

select tests.login('39000000-0000-4000-8000-00000000000e');

select is((select total_cents from public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":2,
       "optionIds":["79000000-0000-4000-8000-000000000002","79000000-0000-4000-8000-000000000003"]}]',
    '89000000-0000-4000-8000-000000000001')),
  17400, 'the order total adds the size and the extra to each unit (2 x (60 + 15 + 12))');
select is((select total_cents from public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":2,
       "optionIds":["79000000-0000-4000-8000-000000000002","79000000-0000-4000-8000-000000000003"]}]',
    '89000000-0000-4000-8000-000000000001')),
  17400, 'a retried order returns the same total');
select throws_ok($$ select public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":1}]', gen_random_uuid()) $$,
  '22023', 'Choose a size for each item.', 'an item with sizes cannot be ordered without a size');
select throws_ok($$ select public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":1,
       "optionIds":["79000000-0000-4000-8000-000000000001","79000000-0000-4000-8000-000000000002"]}]', gen_random_uuid()) $$,
  '22023', 'Choose only one size for each item.', 'an order line cannot have two sizes');
select throws_ok($$ select public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":1,
       "optionIds":["79000000-0000-4000-8000-000000000004"]}]', gen_random_uuid()) $$,
  '22023', 'One or more options are not available.', 'a sold-out size cannot be ordered');
select lives_ok($$ select public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000b","quantity":1}]', gen_random_uuid()) $$,
  'an item without options needs no size');

select tests.logout();
select is((select count(*)::int from public.orders where idempotency_key = '89000000-0000-4000-8000-000000000001'), 1,
  'the retried order was saved once');
select is((select unit_price_cents from public.order_items oi join public.orders o on o.id = oi.order_id
           where o.idempotency_key = '89000000-0000-4000-8000-000000000001'), 8700,
  'the order line stores the unit price with its options');

-- When every size is sold out, the item can still be ordered without one.
update public.item_options set available = false
where item_id = '69000000-0000-4000-8000-00000000000a' and kind = 'size';
select tests.login('39000000-0000-4000-8000-00000000000e');
select lives_ok($$ select public.place_order('19000000-0000-4000-8000-00000000000a',
    '[{"productId":"69000000-0000-4000-8000-00000000000a","quantity":1}]', gen_random_uuid()) $$,
  'an item whose sizes are all sold out can be ordered without a size');

select tests.logout();
select * from finish();
rollback;
