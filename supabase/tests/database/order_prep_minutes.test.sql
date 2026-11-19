-- Shop preparation time (#60): defaults to 5 minutes and must stay in a sensible range. Rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into public.shops (id, name, currency, timezone) values
  ('10000000-0000-4000-8000-00000000000a', 'Shop A', 'HNL', 'UTC');

select is((select prep_minutes from public.shops where id = '10000000-0000-4000-8000-00000000000a'), 5,
  'a new shop prepares orders in 5 minutes by default');
select lives_ok($$ update public.shops set prep_minutes = 12 where id = '10000000-0000-4000-8000-00000000000a' $$,
  'a shop can set its own preparation time');
select throws_ok($$ update public.shops set prep_minutes = 0 where id = '10000000-0000-4000-8000-00000000000a' $$, '23514',
  null, 'zero minutes is rejected');
select throws_ok($$ update public.shops set prep_minutes = 500 where id = '10000000-0000-4000-8000-00000000000a' $$, '23514',
  null, 'more than 120 minutes is rejected');

select * from finish();
rollback;
