-- Guest browsing (issue #17): visitors without an account can read shops and menus, but cannot order.
-- Run with `npm run test:db`. Uses the seed shop; everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

grant all on all tables in schema pg_temp to anon, authenticated, service_role;
grant all on all sequences in schema pg_temp to anon, authenticated, service_role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select ok((select count(*) from public.shops where id = '00000000-0000-4000-8000-000000000001') = 1,
  'a visitor can see the shop');
select ok((select count(*) from public.menu_categories where shop_id = '00000000-0000-4000-8000-000000000001') >= 1,
  'a visitor can see menu categories');
select ok((select count(*) from public.menu_items where shop_id = '00000000-0000-4000-8000-000000000001') >= 1,
  'a visitor can see menu items');
select ok((select count(*) from public.item_options) >= 1, 'a visitor can see item options');
select is_empty($$ select 1 from public.orders $$, 'a visitor sees no orders');
select throws_ok(
  $$ select public.place_order('00000000-0000-4000-8000-000000000001', '[]'::jsonb, '00000000-0000-4000-8000-0000000000e1', null, null) $$,
  '42501', null, 'a visitor cannot place an order (sign-up is required first)');

select * from finish();
rollback;
