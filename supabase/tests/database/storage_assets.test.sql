-- Storage bucket (#44): everyone can read assets; uploads only go to the right folder by the right person.
-- Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

grant all on all tables in schema pg_temp to anon, authenticated, service_role;

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
  ('30000000-0000-4000-8000-00000000000a', 'owner-a@test.local', '{"account_type":"staff"}', '{}'),
  ('32000000-0000-4000-8000-00000000000a', 'barista-a@test.local', '{"account_type":"staff"}', '{}'),
  ('30000000-0000-4000-8000-00000000000b', 'owner-b@test.local', '{"account_type":"staff"}', '{}');

insert into public.shops (id, name, currency) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL'),
  ('10000000-0000-4000-8000-00000000000b', 'Shop B', 'HNL');

insert into public.shop_members (shop_id, user_id, role, active) values
  ('10000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'owner', true),
  ('10000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a', 'barista', true),
  ('10000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'owner', true);

select is((select public from storage.buckets where id = 'assets'), true, 'the assets bucket exists and is public');
select is((select file_size_limit from storage.buckets where id = 'assets'), 5242880::bigint, 'files are limited to 5 MB');

-- Owner of shop A
select tests.login('30000000-0000-4000-8000-00000000000a');

select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'shops/10000000-0000-4000-8000-00000000000a/menu/latte.webp', '30000000-0000-4000-8000-00000000000a') $$,
  'an owner uploads a menu photo for their shop');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'shops/10000000-0000-4000-8000-00000000000a/logo/logo.png', '30000000-0000-4000-8000-00000000000a') $$,
  'an owner uploads their shop logo');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'shops/10000000-0000-4000-8000-00000000000b/menu/latte.webp', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'an owner cannot upload to another shop');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'users/30000000-0000-4000-8000-00000000000b/avatar/me.png', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'nobody can upload into another person''s profile folder');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'random/file.png', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'uploads outside the known folders are refused');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'shops/10000000-0000-4000-8000-00000000000a/menu/script.html', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'non-image file names are refused');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'users/30000000-0000-4000-8000-00000000000a/avatar/me.jpg', '30000000-0000-4000-8000-00000000000a') $$,
  'a user uploads their own profile picture');

-- Barista of shop A
select tests.login('32000000-0000-4000-8000-00000000000a');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('assets', 'shops/10000000-0000-4000-8000-00000000000a/menu/barista.png', '32000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'a barista cannot upload shop images');
select is((select count(*)::int from storage.objects where name like 'shops/10000000-0000-4000-8000-00000000000a/%'), 2,
  'signed-in users can read assets');
select is_empty($$ delete from storage.objects where name like 'shops/%' returning 1 $$, 'a barista cannot delete shop images');

-- Visitors
select tests.login_anon();
select is((select count(*)::int from storage.objects where bucket_id = 'assets'), 3, 'visitors can read assets');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('assets', 'users/30000000-0000-4000-8000-00000000000a/avatar/anon.png') $$,
  '42501', null, 'visitors cannot upload');

select * from finish();
rollback;
