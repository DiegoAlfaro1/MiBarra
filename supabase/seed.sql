-- Local development data only (applied by `supabase db reset`).
insert into public.shops (id, name, currency)
values ('00000000-0000-4000-8000-000000000001', 'MiBarra Demo', 'MXN');

insert into public.products (shop_id, name, price_cents) values
  ('00000000-0000-4000-8000-000000000001', 'Espresso', 3500),
  ('00000000-0000-4000-8000-000000000001', 'Cappuccino', 5500),
  ('00000000-0000-4000-8000-000000000001', 'Latte', 6000);

-- Test logins (password for both: password123). Local only; never seed real users.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'customer@mibarra.test', 'Test Customer'),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'owner@mibarra.test', 'Test Owner')
) as u (id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users
where email in ('customer@mibarra.test', 'owner@mibarra.test');

insert into public.shop_staff (shop_id, user_id, role)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'owner');
