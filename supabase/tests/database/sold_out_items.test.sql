-- Sold-out items (#46, #52): customers and visitors still see sold-out items (the app marks them), staff can
-- bring an item back, and a sold-out item cannot be ordered. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('39000000-0000-4000-8000-00000000000a', 'barista@test.local', '{"account_type":"staff"}', '{}'),
  ('39000000-0000-4000-8000-00000000000c', 'customer@test.local', '{}', '{}');

insert into public.shops (id, name, currency, suspended, is_open) values
  ('19000000-0000-4000-8000-00000000000a', 'Shop', 'HNL', false, true);

insert into public.shop_members (shop_id, user_id, role, active) values
  ('19000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-00000000000a', 'barista', true);

insert into public.menu_categories (id, shop_id, name) values
  ('59000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', 'Café');

insert into public.menu_items (id, shop_id, category_id, name, price_cents, available) values
  ('69000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-00000000000a', 'Latte', 6000, true),
  ('69000000-0000-4000-8000-00000000000b', '19000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-00000000000a', 'Moca', 6500, false);

insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('69000000-0000-4000-8000-00000000000b', 'size', 'Grande', 1000);

-- Visitors and customers see sold-out items too, flagged as unavailable
select tests.login_anon();
select is((select count(*)::int from public.menu_items where shop_id = '19000000-0000-4000-8000-00000000000a'), 2,
  'a visitor sees in-stock and sold-out items');
select isnt_empty($$ select 1 from public.item_options where item_id = '69000000-0000-4000-8000-00000000000b' $$,
  'a visitor sees the options of a sold-out item');

select tests.login('39000000-0000-4000-8000-00000000000c');
select is((select available from public.menu_items where id = '69000000-0000-4000-8000-00000000000b'), false,
  'a customer sees a sold-out item marked as not available');
select throws_ok(
  $$ select public.place_order('19000000-0000-4000-8000-00000000000a',
       '[{"productId":"69000000-0000-4000-8000-00000000000b","quantity":1}]'::jsonb, gen_random_uuid()) $$,
  '22023', 'One or more products are not available at this shop.', 'a sold-out item cannot be ordered');

-- Staff see everything and toggle availability both ways
select tests.login('39000000-0000-4000-8000-00000000000a');
select is((select count(*)::int from public.menu_items where shop_id = '19000000-0000-4000-8000-00000000000a'), 2,
  'staff see sold-out items too');
select is((select available from public.set_item_available('69000000-0000-4000-8000-00000000000a', false)), false,
  'staff can mark an item as sold out');

select tests.login('39000000-0000-4000-8000-00000000000c');
select is((select available from public.menu_items where id = '69000000-0000-4000-8000-00000000000a'), false,
  'the customer sees the item as sold out right away');
select throws_ok(
  $$ select public.set_item_available('69000000-0000-4000-8000-00000000000a', true) $$,
  '22023', 'Menu item not found.', 'a customer cannot bring an item back');

select tests.login('39000000-0000-4000-8000-00000000000a');
select is((select available from public.set_item_available('69000000-0000-4000-8000-00000000000a', true)), true,
  'staff can bring an item back in stock');

select * from finish();
rollback;
