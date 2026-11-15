-- Shops can open or close (#48): the switch stops orders, cannot be turned on outside working hours,
-- and turns itself off when hours end. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

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

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-4000-8000-000000000001', 'cust@test.local', '{}', '{"display_name":"Ana"}'),
  ('30000000-0000-4000-8000-00000000000a', 'owner-a@test.local', '{"account_type":"staff"}', '{}'),
  ('30000000-0000-4000-8000-00000000000b', 'owner-b@test.local', '{"account_type":"staff"}', '{}');

insert into public.shops (id, name, currency, timezone) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL', 'UTC'),
  ('10000000-0000-4000-8000-00000000000b', 'Shop B', 'HNL', 'UTC');

insert into public.shop_members (shop_id, user_id, role, active) values
  ('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'owner', true),
  ('10000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'owner', true);

insert into public.menu_categories (id, shop_id, name) values
  ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Coffee A');
insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('51000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Latte', 5000);

-- ---------------------------------------------------------------------------
-- shop_within_hours (2026-11-16 is a Monday)
-- ---------------------------------------------------------------------------

select is(public.shop_within_hours('{"mon":{"open":"07:00","close":"19:00"}}', 'UTC', '2026-11-16 10:00+00'), true,
  'inside the hours of the day');
select is(public.shop_within_hours('{"mon":{"open":"07:00","close":"19:00"}}', 'UTC', '2026-11-16 06:59+00'), false,
  'before opening');
select is(public.shop_within_hours('{"mon":{"open":"07:00","close":"19:00"}}', 'UTC', '2026-11-16 19:00+00'), false,
  'at closing time the hours are over');
select is(public.shop_within_hours('{"mon":{"open":"07:00","close":"19:00"},"tue":null}', 'UTC', '2026-11-17 10:00+00'), false,
  'a day without hours is closed');
select is(public.shop_within_hours('{}', 'UTC', '2026-11-16 03:00+00'), true,
  'a shop with no schedule has no hour limits');
select is(public.shop_within_hours('{"mon":{"open":"07:00","close":"19:00"}}', 'America/Tegucigalpa', '2026-11-16 13:00+00'), true,
  'hours are read in the shop timezone (13:00 UTC is 07:00 in Honduras)');

-- ---------------------------------------------------------------------------
-- The switch (Shop A is in UTC; "today" is computed so the test works any day)
-- ---------------------------------------------------------------------------

-- Outside hours: every day open except today.
update public.shops set is_open = false, hours = (
  select jsonb_object_agg(d, case when d = lower(to_char(now() at time zone 'UTC', 'Dy'))
                                  then null else '{"open":"00:00","close":"23:59"}'::jsonb end)
  from unnest(array['mon','tue','wed','thu','fri','sat','sun']) as d)
where id = '10000000-0000-4000-8000-00000000000a';

select tests.login('30000000-0000-4000-8000-00000000000a');
select throws_ok($$ select public.set_shop_open('10000000-0000-4000-8000-00000000000a', true) $$,
  '22023', 'You can only open the shop during its working hours.', 'the switch cannot be turned on outside working hours');
select is((select is_open from public.shops where id = '10000000-0000-4000-8000-00000000000a'), false,
  'the shop stays closed after the refused attempt');
select throws_ok($$ select public.set_shop_open('10000000-0000-4000-8000-00000000000b', false) $$,
  '42501', null, 'an owner cannot switch another shop');
select tests.logout();

-- Orders are refused while the shop is switched on but outside its hours.
update public.shops set is_open = true where id = '10000000-0000-4000-8000-00000000000a';
select tests.login('20000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.place_order('10000000-0000-4000-8000-00000000000a',
                    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]', gen_random_uuid()) $$,
  '22023', 'This shop is closed right now.', 'a customer cannot order outside the shop hours even if the switch is on');
select tests.logout();

-- The switch drops by itself when hours end; only the server can run that job.
select cmp_ok(public.close_shops_outside_hours(), '>=', 1, 'close_shops_outside_hours switches off the shop whose hours ended');
select is((select is_open from public.shops where id = '10000000-0000-4000-8000-00000000000a'), false,
  'the stored switch is now off');

-- Inside hours: all days open.
update public.shops set hours = '{"mon":{"open":"00:00","close":"23:59"},"tue":{"open":"00:00","close":"23:59"},"wed":{"open":"00:00","close":"23:59"},"thu":{"open":"00:00","close":"23:59"},"fri":{"open":"00:00","close":"23:59"},"sat":{"open":"00:00","close":"23:59"},"sun":{"open":"00:00","close":"23:59"}}'
where id = '10000000-0000-4000-8000-00000000000a';

select tests.login('30000000-0000-4000-8000-00000000000a');
select is((select is_open from public.set_shop_open('10000000-0000-4000-8000-00000000000a', true)), true,
  'the owner can open the shop inside working hours');
select tests.logout();

select tests.login('20000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.place_order('10000000-0000-4000-8000-00000000000a',
          '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]', gen_random_uuid())), 1,
  'a customer can order when the shop is on and inside its hours');
select throws_ok($$ select public.close_shops_outside_hours() $$, '42501', null, 'customers cannot run the auto-close job');
select tests.logout();

select * from finish();
rollback;
