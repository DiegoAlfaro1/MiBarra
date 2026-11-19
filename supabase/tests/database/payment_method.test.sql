-- Payment method (#59): chosen when the order is placed, fixed afterwards.
-- Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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
  ('20000000-0000-4000-8000-000000000002', 'b1@test.local', '{}', '{"display_name":"Bea"}');

insert into public.shops (id, name, currency, timezone, is_open, hours) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL', 'UTC', true,
   '{"mon":{"open":"00:00","close":"23:59"},"tue":{"open":"00:00","close":"23:59"},"wed":{"open":"00:00","close":"23:59"},"thu":{"open":"00:00","close":"23:59"},"fri":{"open":"00:00","close":"23:59"},"sat":{"open":"00:00","close":"23:59"},"sun":{"open":"00:00","close":"23:59"}}');
insert into public.menu_categories (id, shop_id, name) values
  ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Coffee A');
insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('51000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Latte', 5000);
insert into public.shop_members (shop_id, user_id, role) values
  ('10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000002', 'barista');

select tests.login('20000000-0000-4000-8000-000000000001');

select is((select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000001')).payment_method),
  'counter', 'the payment method defaults to counter');

select is((select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000002', null, null, 'card')).payment_method),
  'card', 'an order can be placed with the demo card method');

select is((select payment_status from public.orders where idempotency_key = 'a0000000-0000-4000-8000-000000000001'),
  'pending', 'a counter order starts unpaid');
select is((select payment_status from public.orders where idempotency_key = 'a0000000-0000-4000-8000-000000000002'),
  'pending', 'a demo card order is not really paid either');

select is((select (public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000002', null, null, 'counter')).payment_method),
  'card', 'a retry with the same key returns the original order and does not change its method');

select throws_ok($$select public.place_order('10000000-0000-4000-8000-00000000000a',
    '[{"productId":"51000000-0000-4000-8000-00000000000a","quantity":1}]'::jsonb,
    'a0000000-0000-4000-8000-000000000003', null, null, 'bitcoin')$$,
  '22023', 'Choose how you want to pay.', 'an unknown payment method is refused');

select throws_ok($$update public.orders set payment_method = 'card'
    where idempotency_key = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'the customer cannot change the method after ordering');

select tests.logout();
select tests.login('20000000-0000-4000-8000-000000000002');

select throws_ok($$update public.orders set payment_method = 'card'
    where idempotency_key = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'staff cannot change the method either');

select is((select payment_method from public.orders where idempotency_key = 'a0000000-0000-4000-8000-000000000002'),
  'card', 'staff see how the customer chose to pay');

select * from finish();
rollback;
