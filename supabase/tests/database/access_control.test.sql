-- Access control tests (issue #22). Run with `npm run test:db` (needs `npm run db:start`).
-- Each case signs in as a role and checks what the database allows. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(77);

-- pgTAP keeps its state in temp tables; the test roles need to write to them.
grant all on all tables in schema pg_temp to anon, authenticated, service_role;
grant all on all sequences in schema pg_temp to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers: act as a signed-in user, the public, the server, or the database owner.
-- ---------------------------------------------------------------------------

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

create function tests.login_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end;
$$;

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fixtures: shops A and B, two customers, staff at each shop, a platform admin.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-4000-8000-000000000001', 'cust1@test.local', '{}', '{"display_name":"Ana"}'),
  ('20000000-0000-4000-8000-000000000002', 'cust2@test.local', '{}', '{"display_name":"Beto"}'),
  ('30000000-0000-4000-8000-00000000000a', 'owner-a@test.local', '{"account_type":"staff"}', '{}'),
  ('31000000-0000-4000-8000-00000000000a', 'manager-a@test.local', '{"account_type":"staff"}', '{}'),
  ('32000000-0000-4000-8000-00000000000a', 'barista-a@test.local', '{"account_type":"staff"}', '{}'),
  ('32000000-0000-4000-8000-00000000000b', 'barista-b@test.local', '{"account_type":"staff"}', '{}'),
  ('33000000-0000-4000-8000-00000000000a', 'fired-a@test.local', '{"account_type":"staff"}', '{}'),
  ('34000000-0000-4000-8000-00000000000a', 'new-a@test.local', '{"account_type":"staff"}', '{}'),
  ('40000000-0000-4000-8000-000000000001', 'admin@test.local', '{"account_type":"staff"}', '{}');

update public.customers set phone = '+50499990001' where id = '20000000-0000-4000-8000-000000000001';

insert into public.shops (id, name, loyalty_stamps_required, loyalty_reward) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 2, 'Free coffee'),
  ('10000000-0000-4000-8000-00000000000b', 'Shop B', 5, 'Free coffee');

insert into public.shop_members (shop_id, user_id, role, active) values
  ('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'owner', true),
  ('10000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-00000000000a', 'manager', true),
  ('10000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a', 'barista', true),
  ('10000000-0000-4000-8000-00000000000b', '32000000-0000-4000-8000-00000000000b', 'barista', true),
  ('10000000-0000-4000-8000-00000000000a', '33000000-0000-4000-8000-00000000000a', 'barista', false);

insert into public.platform_admins (user_id) values ('40000000-0000-4000-8000-000000000001');

insert into public.menu_categories (id, shop_id, name) values
  ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Coffee'),
  ('50000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Coffee');

insert into public.menu_items (id, shop_id, category_id, name, price_cents) values
  ('51000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Latte', 5000),
  ('51000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', '50000000-0000-4000-8000-00000000000b', 'Latte', 5000);

-- o1: cust1 at A (pending), o2: cust2 at A (pending), o3: cust1 at B, o4: cust1 at A (preparing, paid)
insert into public.orders (id, shop_id, customer_id, total_cents, idempotency_key, status, payment_status) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000001', 5000, gen_random_uuid(), 'pending', 'pending'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000002', 5000, gen_random_uuid(), 'pending', 'pending'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-000000000001', 5000, gen_random_uuid(), 'pending', 'pending'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000001', 5000, gen_random_uuid(), 'preparing', 'paid');

insert into public.loyalty_cards (id, customer_id, shop_id, stamps, rewards_available, qr_code_value) values
  ('70000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a', 0, 0, 'qr-cust1-shop-a');

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

select is((select count(*)::int from public.customers where id::text like '3%' or id::text like '4%'), 0,
  'staff logins get no customers row');

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

select tests.login('20000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.orders), 3, 'a customer sees only their own orders');
select is_empty($$ select 1 from public.orders where id = '60000000-0000-4000-8000-000000000002' $$,
  'a customer cannot read another customer''s order');
select is_empty($$ select 1 from public.customers where id = '20000000-0000-4000-8000-000000000002' $$,
  'a customer cannot read another customer''s profile');
select is_empty($$ select 1 from public.shop_members $$, 'a customer sees no shop team');
select throws_ok($$ select public.cancel_order('60000000-0000-4000-8000-000000000002') $$,
  '22023', 'Order not found.', 'a customer cannot cancel another customer''s order');
select throws_ok($$ select public.cancel_order('60000000-0000-4000-8000-000000000004') $$,
  '42501', null, 'a customer cannot cancel once preparation has started');
select is((select status from public.cancel_order('60000000-0000-4000-8000-000000000003')), 'cancelled',
  'a customer can cancel their own pending order');
select is((select status from public.cancel_order('60000000-0000-4000-8000-000000000003')), 'cancelled',
  'cancelling twice is safe');
select throws_ok($$ insert into public.shop_members (shop_id, user_id, role)
                    values ('10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000001', 'owner') $$,
  '42501', null, 'a customer cannot make themselves staff');
select throws_ok($$ select public.add_shop_member('20000000-0000-4000-8000-000000000001',
                    '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000001', 'owner') $$,
  '42501', null, 'a customer cannot call the server-only invite function');
select throws_ok($$ insert into public.platform_admins (user_id) values ('20000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a customer cannot make themselves a platform admin');
select throws_ok($$ update public.loyalty_cards set stamps = 99 $$,
  '42501', null, 'a customer cannot write stamps');
select throws_ok($$ select public.shop_daily_order_count('10000000-0000-4000-8000-00000000000a', now()) $$,
  '42501', null, 'a customer cannot see shop reports');

select tests.logout();
update public.orders set status = 'pending' where id = '60000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- The public (not signed in)
-- ---------------------------------------------------------------------------

select tests.login_anon();
select is((select count(*)::int from public.shops where id::text like '1%'), 2, 'anyone can browse open shops');
select is((select count(*)::int from public.menu_items where id::text like '5%'), 2, 'anyone can browse menus');
select is_empty($$ select 1 from public.orders $$, 'the public sees no orders');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Barista at shop A
-- ---------------------------------------------------------------------------

select tests.login('32000000-0000-4000-8000-00000000000a');

select is((select count(*)::int from public.orders where id::text like '6%'), 3, 'a barista sees their shop''s orders');
select is_empty($$ select 1 from public.orders where shop_id = '10000000-0000-4000-8000-00000000000b' $$,
  'staff at shop A cannot see shop B orders');
select is_empty($$ select 1 from public.loyalty_cards where shop_id = '10000000-0000-4000-8000-00000000000b' $$,
  'staff at shop A cannot see shop B loyalty cards');

update public.menu_items set price_cents = 1 where id = '51000000-0000-4000-8000-00000000000a';
select tests.logout();
select is((select price_cents from public.menu_items where id = '51000000-0000-4000-8000-00000000000a'), 5000,
  'a barista cannot edit prices');
select tests.login('32000000-0000-4000-8000-00000000000a');

select throws_ok($$ insert into public.menu_items (shop_id, category_id, name, price_cents)
                    values ('10000000-0000-4000-8000-00000000000a', '50000000-0000-4000-8000-00000000000a', 'Cheap', 1) $$,
  '42501', null, 'a barista cannot add menu items');
select is((select available from public.set_item_available('51000000-0000-4000-8000-00000000000a', false)), false,
  'a barista can mark an item sold out');
select throws_ok($$ select public.set_item_available('51000000-0000-4000-8000-00000000000b', false) $$,
  '22023', 'Menu item not found.', 'a barista cannot mark another shop''s item sold out');

update public.orders set status = 'preparing' where id = '60000000-0000-4000-8000-000000000001';
select is((select status from public.orders where id = '60000000-0000-4000-8000-000000000001'), 'preparing',
  'a barista can change order status');
select throws_ok($$ update public.orders set total_cents = 1 where id = '60000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'a barista cannot change an order total');
select throws_ok($$ update public.orders set status = 'cancelled' where id = '60000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'cancelling by a plain status update is blocked');
select throws_ok($$ select public.cancel_order('60000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a barista cannot cancel after preparation starts');
select is((select payment_status from public.mark_order_paid('60000000-0000-4000-8000-000000000001')), 'paid',
  'a barista can mark an order paid');
select is((select payment_status from public.mark_order_paid('60000000-0000-4000-8000-000000000001')), 'paid',
  'marking paid twice is safe');
select throws_ok($$ select public.refund_order('60000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a barista cannot refund');
select throws_ok($$ select public.set_shop_open('10000000-0000-4000-8000-00000000000a', false) $$,
  '42501', null, 'a barista cannot open or close the shop');
select throws_ok($$ update public.shops set name = 'Mine' where id = '10000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'a barista cannot edit the shop directly');

select is_empty($$ select 1 from public.customers $$, 'a barista cannot read customer contact details');
select is((select name from public.shop_customer_names('10000000-0000-4000-8000-00000000000a')
           where customer_id = '20000000-0000-4000-8000-000000000001'), 'Ana',
  'a barista can see customer names');
select is(public.shop_daily_order_count('10000000-0000-4000-8000-00000000000a', date_trunc('day', now())), 3,
  'a barista can see the daily order count');
select throws_ok($$ select public.shop_sales_report('10000000-0000-4000-8000-00000000000a', now() - interval '1 day', now()) $$,
  '42501', null, 'a barista cannot see sales reports');
select throws_ok($$ select public.set_loyalty_rule('10000000-0000-4000-8000-00000000000a', 3, 'Cookie') $$,
  '42501', null, 'a barista cannot change loyalty rules');
select is_empty($$ select 1 from public.audit_log $$, 'a barista cannot read the audit log');

-- QR scanning is idempotent per scan reference.
select is((select stamps from public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'stamp', '80000000-0000-4000-8000-000000000001')), 1,
  'a barista can stamp a loyalty card');
select is((select stamps from public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'stamp', '80000000-0000-4000-8000-000000000001')), 1,
  'a retried scan does not stamp twice');
select throws_ok($$ select public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'redeem', gen_random_uuid()) $$,
  '22023', 'No reward is available on this card yet.', 'a reward cannot be redeemed before it is earned');
select is((select rewards_available from public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'stamp', gen_random_uuid())), 1,
  'enough stamps earn a reward');
select is((select rewards_available from public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'redeem', gen_random_uuid())), 0,
  'a barista can redeem a reward');
select throws_ok($$ select public.place_order('10000000-0000-4000-8000-00000000000b',
                    '[{"productId":"51000000-0000-4000-8000-00000000000b","quantity":1}]', gen_random_uuid()) $$,
  '28000', null, 'staff logins cannot place orders');
select is(public.can_invite_staff('10000000-0000-4000-8000-00000000000a', 'barista'), false, 'a barista cannot invite staff');

select tests.logout();

-- ---------------------------------------------------------------------------
-- Barista at shop B cannot touch shop A
-- ---------------------------------------------------------------------------

select tests.login('32000000-0000-4000-8000-00000000000b');
update public.orders set status = 'ready' where id = '60000000-0000-4000-8000-000000000002';
select throws_ok($$ select public.scan_loyalty_card('10000000-0000-4000-8000-00000000000a', 'qr-cust1-shop-a', 'stamp', gen_random_uuid()) $$,
  '42501', null, 'staff at shop B cannot scan cards at shop A');
select tests.logout();
select is((select status from public.orders where id = '60000000-0000-4000-8000-000000000002'), 'pending',
  'staff at shop B cannot change shop A orders');

-- A removed (inactive) barista has no access.
select tests.login('33000000-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.orders $$, 'a removed barista sees no orders');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Manager at shop A
-- ---------------------------------------------------------------------------

select tests.login('31000000-0000-4000-8000-00000000000a');

update public.menu_items set price_cents = 5500 where id = '51000000-0000-4000-8000-00000000000a';
select is((select price_cents from public.menu_items where id = '51000000-0000-4000-8000-00000000000a'), 5500,
  'a manager can edit prices');
select is((select status from public.cancel_order('60000000-0000-4000-8000-000000000004', 'Out of milk')), 'cancelled',
  'a manager can cancel after preparation starts');
select is((select payment_status from public.refund_order('60000000-0000-4000-8000-000000000004')), 'refunded',
  'a manager can refund');
select is((select payment_status from public.refund_order('60000000-0000-4000-8000-000000000004')), 'refunded',
  'refunding twice is safe');
select is((select phone from public.customers where id = '20000000-0000-4000-8000-000000000001'), '+50499990001',
  'a manager can see the phone of customers who ordered at their shop');
select is((select is_open from public.set_shop_open('10000000-0000-4000-8000-00000000000a', false)), false,
  'a manager can close the shop');
select throws_ok($$ select public.set_loyalty_rule('10000000-0000-4000-8000-00000000000a', 3, 'Cookie') $$,
  '42501', null, 'a manager cannot change loyalty rules');
select throws_ok($$ select public.set_shop_payment_provider('10000000-0000-4000-8000-00000000000a', 'stripe') $$,
  '42501', null, 'a manager cannot change the payment provider');
select ok(public.can_invite_staff('10000000-0000-4000-8000-00000000000a', 'barista')
          and not public.can_invite_staff('10000000-0000-4000-8000-00000000000a', 'manager'),
  'a manager can invite baristas only');
select throws_ok($$ select public.remove_shop_member('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'a manager cannot remove the owner');
select is((select active from public.remove_shop_member('10000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a')), false,
  'a manager can remove a barista');
select tests.logout();

select tests.login('32000000-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.orders $$, 'removing a barista ends their access at once');
select tests.logout();

select is((select count(*)::int from public.audit_log
           where shop_id = '10000000-0000-4000-8000-00000000000a'
             and action in ('order.cancel', 'order.refund', 'staff.remove')), 3,
  'late cancel, refund and staff removal are each logged once');

-- ---------------------------------------------------------------------------
-- Server-side invitation (staff-invite edge function uses the service role)
-- ---------------------------------------------------------------------------

select tests.login_service();
select throws_ok($$ select public.add_shop_member('31000000-0000-4000-8000-00000000000a',
                    '10000000-0000-4000-8000-00000000000a', '34000000-0000-4000-8000-00000000000a', 'manager') $$,
  '42501', null, 'the server re-checks the inviter''s role');
select is((select role from public.add_shop_member('31000000-0000-4000-8000-00000000000a',
          '10000000-0000-4000-8000-00000000000a', '34000000-0000-4000-8000-00000000000a', 'barista')), 'barista',
  'a manager''s barista invitation is accepted');
select throws_ok($$ select public.add_shop_member('30000000-0000-4000-8000-00000000000a',
                    '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000001', 'barista') $$,
  '22023', null, 'a customer account cannot be turned into a staff account');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Owner at shop A
-- ---------------------------------------------------------------------------

select tests.login('30000000-0000-4000-8000-00000000000a');
select is((select loyalty_stamps_required from public.set_loyalty_rule('10000000-0000-4000-8000-00000000000a', 3, 'Cookie')), 3,
  'an owner can change loyalty rules');
select throws_ok($$ select public.remove_shop_member('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a') $$,
  '22023', 'A shop needs at least one owner.', 'the last owner cannot be removed');
select is_empty($$ select 1 from public.audit_log where shop_id <> '10000000-0000-4000-8000-00000000000a' $$,
  'an owner reads only their shop''s audit log');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Platform admin
-- ---------------------------------------------------------------------------

select tests.login('40000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.orders where id::text like '6%'), 4, 'a platform admin can view every shop''s orders');
update public.orders set status = 'ready' where id = '60000000-0000-4000-8000-000000000003';
select is((select contact.phone from public.admin_customer_contact('20000000-0000-4000-8000-000000000001') as contact), '+50499990001',
  'a platform admin can see customer contact details');
update public.menu_items set price_cents = 4500 where id = '51000000-0000-4000-8000-00000000000b';
select is((select price_cents from public.menu_items where id = '51000000-0000-4000-8000-00000000000b'), 4500,
  'a platform admin can edit any shop''s menu');
select is((select suspended from public.admin_set_shop_suspended('10000000-0000-4000-8000-00000000000b', true)), true,
  'a platform admin can suspend a shop');
select tests.logout();

select is((select status from public.orders where id = '60000000-0000-4000-8000-000000000003'), 'pending',
  'a platform admin cannot change order status');
select is((select count(*)::int from public.audit_log
           where user_id = '40000000-0000-4000-8000-000000000001'
             and action in ('admin.customer.view_contact', 'admin.shop.suspend', 'admin.menu_items.update')), 3,
  'platform admin actions are logged');

select tests.login_anon();
select is_empty($$ select 1 from public.shops where id = '10000000-0000-4000-8000-00000000000b' $$,
  'a suspended shop is hidden from the public');
select tests.logout();

select tests.login('32000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from public.orders), 1, 'staff of a suspended shop still see its orders');
select tests.logout();

-- The audit log is append-only, even for the database owner.
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'audit entries cannot be deleted');

select * from finish();
rollback;
