-- Pickup slots (#55): slots come from the shop's hours, and place_order enforces them.
-- Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

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
  ('20000000-0000-4000-8000-000000000001', 'c1@test.local', '{}', '{"display_name":"Ana"}'),
  ('20000000-0000-4000-8000-000000000002', 'c2@test.local', '{}', '{"display_name":"Luis"}');

-- Open every day around the clock so the tests do not depend on the time they run.
insert into public.shops (id, name, currency, timezone, is_open, slot_minutes, hours) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL', 'UTC', true, 5,
   '{"mon":{"open":"00:00","close":"23:59"},"tue":{"open":"00:00","close":"23:59"},"wed":{"open":"00:00","close":"23:59"},"thu":{"open":"00:00","close":"23:59"},"fri":{"open":"00:00","close":"23:59"},"sat":{"open":"00:00","close":"23:59"},"sun":{"open":"00:00","close":"23:59"}}');

insert into public.menu_categories (id, shop_id, name) values
  ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Coffee A');
insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('51000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Latte', 5000);

create temp table slot_pick as
  select public.pickup_slot_start(now() + interval '2 hours', 5) as t;
grant all on slot_pick to anon, authenticated, service_role;

select tests.login('20000000-0000-4000-8000-000000000001');

select is(public.pickup_slot_start('2026-11-18 15:47+00', 30), '2026-11-18 15:30+00'::timestamptz,
  'a time maps to the start of its slot');

select ok(exists (select 1 from public.list_pickup_slots('10000000-0000-4000-8000-00000000000a')),
  'an open shop lists slots');

select is(
  (select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000001')).pickup_time),
  null::timestamptz,
  'no pickup time means prepare as soon as possible');

select is(
  (select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000002', (select t from slot_pick))).pickup_time),
  (select t from slot_pick),
  'an order can choose a pickup slot');

select is(
  (select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000002', (select t from slot_pick))).idempotency_key),
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'retrying with the same key returns the original order');

select tests.logout();
select tests.login('20000000-0000-4000-8000-000000000002');

select is(
  (select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'b0000000-0000-4000-8000-000000000001', (select t from slot_pick))).pickup_time),
  (select t from slot_pick),
  'several customers can choose the same slot');

select throws_ok(
  $$select public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'b0000000-0000-4000-8000-000000000002', now() - interval '1 hour')$$,
  '22023', 'Pickup time must be in the future.', 'a time in the past is refused');

select tests.logout();
update public.shops set hours = '{"mon":{"open":"07:00","close":"19:00"},"tue":{"open":"07:00","close":"19:00"},"wed":{"open":"07:00","close":"19:00"},"thu":{"open":"07:00","close":"19:00"},"fri":{"open":"07:00","close":"19:00"},"sat":{"open":"07:00","close":"19:00"},"sun":{"open":"07:00","close":"19:00"}}'
  where id = '10000000-0000-4000-8000-00000000000a';
select tests.login('20000000-0000-4000-8000-000000000002');

select throws_ok(
  $$select public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'b0000000-0000-4000-8000-000000000003',
    date_trunc('day', now() + interval '1 day') + interval '3 hours')$$,
  '22023', null, 'a time outside the shop hours is refused');

select tests.logout();
update public.shops set is_open = false where id = '10000000-0000-4000-8000-00000000000a';
select is((select count(*)::int from public.list_pickup_slots('10000000-0000-4000-8000-00000000000a')), 0,
  'a closed shop has no slots');

select * from finish();
rollback;
