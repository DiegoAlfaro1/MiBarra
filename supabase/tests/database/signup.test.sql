-- Sign-up tests (issue #16). Run with `npm run test:db` (needs `npm run db:start`).
-- Creating a login (email or phone) must create the customer's own row, filled from the sign-up data.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

grant all on all tables in schema pg_temp to anon, authenticated, service_role;
grant all on all sequences in schema pg_temp to anon, authenticated, service_role;

-- What Supabase Auth inserts for supabase.auth.signUp({ email | phone, options: { data: { display_name } } }).
insert into auth.users (instance_id, id, aud, role, email, phone, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'nuevo@mibarra.test', null, '{"display_name":"Ana Email"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   null, '50499990002', '{"display_name":"Beto Phone"}', now(), now());

select is((select name from public.customers where id = '30000000-0000-4000-8000-000000000001'), 'Ana Email',
  'an email sign-up creates a customer with the display name');
select is((select email from public.customers where id = '30000000-0000-4000-8000-000000000001'), 'nuevo@mibarra.test',
  'the customer keeps the sign-up email');
select is((select phone from public.customers where id = '30000000-0000-4000-8000-000000000002'), '50499990002',
  'a phone sign-up creates a customer with the phone number');
select is((select email from public.customers where id = '30000000-0000-4000-8000-000000000002'), null,
  'a phone sign-up has no email');

-- A second account with the same email or phone is rejected, so one person cannot own two accounts.
select throws_ok(
  $$insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'nuevo@mibarra.test', now(), now())$$,
  '23505', null, 'the same email cannot sign up twice');
select throws_ok(
  $$insert into auth.users (instance_id, id, aud, role, phone, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', '50499990002', now(), now())$$,
  '23505', null, 'the same phone cannot sign up twice');

-- A new customer can read only their own row.
create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
select pg_temp.as_user('30000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.customers where id in ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002')), 1,
  'a new customer sees their own row and not another customer''s');

select * from finish();
rollback;
