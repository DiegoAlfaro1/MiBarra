-- Shop and menu management (#37): the owner edits the shop profile (name, logo, address, phone, hours)
-- and builds the menu; other roles and other shops are refused. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

grant all on all tables in schema pg_temp to anon, authenticated, service_role;
grant all on all sequences in schema pg_temp to anon, authenticated, service_role;

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
  ('30000000-0000-4000-8000-00000000000a', 'owner-a@test.local', '{"account_type":"staff"}', '{}'),
  ('31000000-0000-4000-8000-00000000000a', 'manager-a@test.local', '{"account_type":"staff"}', '{}'),
  ('32000000-0000-4000-8000-00000000000a', 'barista-a@test.local', '{"account_type":"staff"}', '{}'),
  ('30000000-0000-4000-8000-00000000000b', 'owner-b@test.local', '{"account_type":"staff"}', '{}');

insert into public.shops (id, name, currency) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL'),
  ('10000000-0000-4000-8000-00000000000b', 'Shop B', 'HNL');

insert into public.shop_members (shop_id, user_id, role, active) values
  ('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'owner', true),
  ('10000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-00000000000a', 'manager', true),
  ('10000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a', 'barista', true),
  ('10000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'owner', true);

insert into public.menu_categories (id, shop_id, name) values
  ('50000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Coffee B');

-- ---------------------------------------------------------------------------
-- Shop profile
-- ---------------------------------------------------------------------------

select tests.login('30000000-0000-4000-8000-00000000000a');

select is(
  (select row(name, address, phone, logo_url)::text from public.update_shop_profile(
    '10000000-0000-4000-8000-00000000000a', '  Café Lempa ', 'Col. Palmira, Tegucigalpa', 'https://example.com/logo.png',
    '{"mon": {"open": "07:00", "close": "19:00"}, "sun": null}', '+50422223333')),
  row('Café Lempa', 'Col. Palmira, Tegucigalpa', '+50422223333', 'https://example.com/logo.png')::text,
  'the owner saves name, address, phone and logo (name trimmed)'
);

select is((select hours from public.shops where id = '10000000-0000-4000-8000-00000000000a'),
  '{"mon": {"open": "07:00", "close": "19:00"}, "sun": null}'::jsonb, 'the owner saves the opening hours');

select is(
  (select row(address, phone, logo_url)::text from public.update_shop_profile(
    '10000000-0000-4000-8000-00000000000a', 'Café Lempa', ' ', '', '{}', '')),
  row(null::text, null::text, null::text)::text,
  'blank address, phone and logo are cleared'
);

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null, '{}', '2222-3333') $$,
  '22023', null, 'a phone that is not E.164 is rejected');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, 'logo.png', '{}', null) $$,
  '22023', null, 'a logo that is not a web link is rejected');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null,
  '{"mon": {"open": "19:00", "close": "07:00"}}', null) $$,
  '22023', null, 'opening after closing is rejected');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null,
  '{"lunes": {"open": "07:00", "close": "19:00"}}', null) $$,
  '22023', null, 'an unknown day is rejected');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null,
  '{"mon": {"open": "7am", "close": "19:00"}}', null) $$,
  '22023', null, 'a time that is not HH:MM is rejected');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', '   ', null, null, '{}', null) $$,
  '22023', null, 'an empty name is rejected');

select throws_ok($$ update public.shops set phone = '+50411112222' where id = '10000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'the owner cannot bypass the function with a direct update');

select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000b', 'Mine', null, null, '{}', null) $$,
  '42501', null, 'an owner cannot edit another shop');

select tests.login('31000000-0000-4000-8000-00000000000a');
select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null, '{}', null) $$,
  '42501', null, 'a manager cannot edit the shop profile');

select tests.login('32000000-0000-4000-8000-00000000000a');
select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null, '{}', null) $$,
  '42501', null, 'a barista cannot edit the shop profile');

select tests.login_anon();
select throws_ok($$ select public.update_shop_profile('10000000-0000-4000-8000-00000000000a', 'X', null, null, '{}', null) $$,
  '42501', null, 'visitors cannot edit the shop profile');

select tests.logout();
select throws_ok($$ insert into public.shops (name, currency, hours) values ('Bad', 'HNL', '{"mon": {"open": "10:00"}}') $$,
  '23514', null, 'the table itself refuses invalid hours');

-- ---------------------------------------------------------------------------
-- Menu: categories and items with description, photo and price
-- ---------------------------------------------------------------------------

select tests.login('30000000-0000-4000-8000-00000000000a');

select lives_ok($$ insert into public.menu_categories (id, shop_id, name, sort_order)
  values ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Bebidas calientes', 1) $$,
  'the owner creates a category');

select lives_ok($$ insert into public.menu_items (shop_id, category_id, name, description, photo_url, price_cents)
  values ('10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Latte',
          'Espresso con leche vaporizada', 'https://example.com/latte.jpg', 6000) $$,
  'the owner creates an item with description, photo and price');

select throws_ok($$ insert into public.menu_items (shop_id, category_id, name, price_cents)
  values ('10000000-0000-4000-8000-00000000000b', '50000000-0000-4000-8000-00000000000b', 'Intruso', 100) $$,
  '42501', null, 'an owner cannot add items to another shop');

select tests.login('32000000-0000-4000-8000-00000000000a');
select throws_ok($$ insert into public.menu_categories (shop_id, name)
  values ('10000000-0000-4000-8000-00000000000a', 'Postres') $$,
  '42501', null, 'a barista cannot create categories');

select tests.login_anon();
select is((select name from public.shops where id = '10000000-0000-4000-8000-00000000000a'), 'Café Lempa',
  'visitors can read the public shop profile');

select * from finish();
rollback;
