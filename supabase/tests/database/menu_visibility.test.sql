-- Menu categories and items for customers (#38): visitors and customers read the menu of active
-- shops, a suspended shop's menu is hidden from them but not from its staff, and a shop cannot
-- have two categories with the same name. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

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
  ('38000000-0000-4000-8000-00000000000a', 'owner-open@test.local', '{"account_type":"staff"}', '{}'),
  ('38000000-0000-4000-8000-00000000000b', 'owner-suspended@test.local', '{"account_type":"staff"}', '{}'),
  ('38000000-0000-4000-8000-00000000000c', 'customer@test.local', '{}', '{}');

insert into public.shops (id, name, currency, suspended, is_open) values
  ('18000000-0000-4000-8000-00000000000a', 'Open shop', 'HNL', false, true),
  ('18000000-0000-4000-8000-00000000000b', 'Suspended shop', 'HNL', true, false);

insert into public.shop_members (shop_id, user_id, role, active) values
  ('18000000-0000-4000-8000-00000000000a', '38000000-0000-4000-8000-00000000000a', 'owner', true),
  ('18000000-0000-4000-8000-00000000000b', '38000000-0000-4000-8000-00000000000b', 'owner', true);

insert into public.menu_categories (id, shop_id, name) values
  ('58000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-00000000000a', 'Café'),
  ('58000000-0000-4000-8000-00000000000b', '18000000-0000-4000-8000-00000000000b', 'Café');

insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('68000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-00000000000a', '58000000-0000-4000-8000-00000000000a', 'Latte', 6000),
  ('68000000-0000-4000-8000-00000000000b', '18000000-0000-4000-8000-00000000000b', '58000000-0000-4000-8000-00000000000b', 'Latte', 6000);

insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('68000000-0000-4000-8000-00000000000a', 'size', 'Grande', 1000),
  ('68000000-0000-4000-8000-00000000000b', 'size', 'Grande', 1000);

-- ---------------------------------------------------------------------------
-- Visitors and customers
-- ---------------------------------------------------------------------------

select tests.login_anon();
select is((select count(*)::int from public.menu_categories where shop_id = '18000000-0000-4000-8000-00000000000a'), 1,
  'a visitor sees the categories of an active shop');
select is((select count(*)::int from public.menu_items where shop_id = '18000000-0000-4000-8000-00000000000a'), 1,
  'a visitor sees the items of an active shop');
select is_empty($$ select 1 from public.menu_categories where shop_id = '18000000-0000-4000-8000-00000000000b' $$,
  'a visitor does not see the categories of a suspended shop');
select is_empty($$ select 1 from public.menu_items where shop_id = '18000000-0000-4000-8000-00000000000b' $$,
  'a visitor does not see the items of a suspended shop');
select is_empty($$ select 1 from public.item_options where item_id = '68000000-0000-4000-8000-00000000000b' $$,
  'a visitor does not see the options of a suspended shop');

select tests.login('38000000-0000-4000-8000-00000000000c');
select is((select count(*)::int from public.item_options where item_id in
    ('68000000-0000-4000-8000-00000000000a', '68000000-0000-4000-8000-00000000000b')), 1,
  'a customer sees only the options of active shops');
select is_empty($$ select 1 from public.menu_items where shop_id = '18000000-0000-4000-8000-00000000000b' $$,
  'a customer does not see the items of a suspended shop');

-- ---------------------------------------------------------------------------
-- Staff of the suspended shop
-- ---------------------------------------------------------------------------

select tests.login('38000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from public.menu_items where shop_id = '18000000-0000-4000-8000-00000000000b'), 1,
  'the owner of a suspended shop still sees its menu');

-- ---------------------------------------------------------------------------
-- Category names are unique per shop
-- ---------------------------------------------------------------------------

select tests.login('38000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ insert into public.menu_categories (shop_id, name) values ('18000000-0000-4000-8000-00000000000a', 'Café') $$,
  '23505', null, 'a shop cannot have two categories with the same name');
select throws_ok(
  $$ insert into public.menu_categories (shop_id, name) values ('18000000-0000-4000-8000-00000000000a', '  café ') $$,
  '23505', null, 'the name check ignores case and outer spaces');
select lives_ok(
  $$ insert into public.menu_categories (shop_id, name) values ('18000000-0000-4000-8000-00000000000a', 'Repostería') $$,
  'the owner can add a category with a new name');

select tests.logout();
select lives_ok(
  $$ insert into public.menu_categories (shop_id, name) values ('18000000-0000-4000-8000-00000000000b', 'Repostería') $$,
  'another shop can use the same category name');

select * from finish();
rollback;
