-- Dashboard sign-in gate tests (issue #21). Run with `npm run test:db`. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

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
grant execute on all functions in schema tests to anon, authenticated, service_role;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-4000-8000-000000000001', 'cust@test.local', '{}', '{"display_name":"Ana"}'),
  ('30000000-0000-4000-8000-00000000000a', 'owner@test.local', '{"account_type":"staff"}', '{}'),
  ('31000000-0000-4000-8000-00000000000a', 'manager@test.local', '{"account_type":"staff"}', '{}'),
  ('32000000-0000-4000-8000-00000000000a', 'barista@test.local', '{"account_type":"staff"}', '{}'),
  ('33000000-0000-4000-8000-00000000000a', 'fired@test.local', '{"account_type":"staff"}', '{}'),
  ('40000000-0000-4000-8000-000000000001', 'admin@test.local', '{"account_type":"staff"}', '{}');
update public.customers set phone = '+50499990001' where id = '20000000-0000-4000-8000-000000000001';

insert into public.shops (id, name, loyalty_stamps_required, loyalty_reward) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 2, 'Free coffee');
insert into public.shop_members (shop_id, user_id, role, active) values
  ('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'owner', true),
  ('10000000-0000-4000-8000-00000000000a', '31000000-0000-4000-8000-00000000000a', 'manager', true),
  ('10000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a', 'barista', true),
  ('10000000-0000-4000-8000-00000000000a', '33000000-0000-4000-8000-00000000000a', 'barista', false);
insert into public.platform_admins (user_id) values ('40000000-0000-4000-8000-000000000001');

select tests.login('20000000-0000-4000-8000-000000000001');
select is_empty($$ select * from public.dashboard_access() $$, 'a customer gets no dashboard access');

select tests.login('32000000-0000-4000-8000-00000000000a');
select results_eq($$ select role from public.dashboard_access() $$, $$ values ('barista') $$, 'a barista can open the dashboard');

select tests.login('31000000-0000-4000-8000-00000000000a');
select results_eq($$ select role from public.dashboard_access() $$, $$ values ('manager') $$, 'a manager can open the dashboard');

select tests.login('30000000-0000-4000-8000-00000000000a');
select results_eq($$ select role, shop_name from public.dashboard_access() $$, $$ values ('owner', 'Shop A') $$,
  'an owner can open the dashboard and sees their shop');

select tests.login('40000000-0000-4000-8000-000000000001');
select results_eq($$ select role from public.dashboard_access() $$, $$ values ('platform_admin') $$,
  'a platform admin can open the dashboard');

select tests.login('33000000-0000-4000-8000-00000000000a');
select is_empty($$ select * from public.dashboard_access() $$, 'deactivated staff lose dashboard access');

select tests.login_anon();
select throws_ok($$ select * from public.dashboard_access() $$, '42501', null, 'signed-out users cannot call it');

select * from finish();
rollback;
