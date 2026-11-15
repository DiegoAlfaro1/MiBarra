-- Local development data only (applied by `supabase db reset`).
insert into public.shops (
  id, name, currency, address, phone, hours, is_open, payment_provider, loyalty_stamps_required, loyalty_reward
) values (
  '00000000-0000-4000-8000-000000000001', 'MiBarra Demo', 'HNL', 'Col. Lomas del Guijarro, Tegucigalpa', '+50422345678',
  '{"mon": {"open": "07:00", "close": "19:00"}, "tue": {"open": "07:00", "close": "19:00"}, "wed": {"open": "07:00", "close": "19:00"}, "thu": {"open": "07:00", "close": "19:00"}, "fri": {"open": "07:00", "close": "19:00"}, "sat": {"open": "08:00", "close": "17:00"}, "sun": null}',
  true, 'cash', 8, 'Bebida gratis'
);

insert into public.menu_categories (id, shop_id, name, sort_order) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'Café', 1),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001', 'Repostería', 2);

insert into public.menu_items (id, shop_id, category_id, name, description, price_cents) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c1', 'Espresso', 'Shot doble de la casa', 3500),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c1', 'Cappuccino', 'Espresso con leche vaporizada', 5500),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c1', 'Latte', 'Espresso con mucha leche', 6000),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000c2', 'Croissant', 'De mantequilla, horneado hoy', 4500);

insert into public.item_options (item_id, kind, name, price_change_cents) values
  ('00000000-0000-4000-8000-0000000000d2', 'size', 'Mediano 12 oz', 0),
  ('00000000-0000-4000-8000-0000000000d2', 'size', 'Grande 16 oz', 1000),
  ('00000000-0000-4000-8000-0000000000d2', 'extra', 'Sirope de vainilla', 1500);

-- Test logins (password for all: password123). Local only; never seed real users.
-- Staff logins are marked account_type = staff in app metadata, so they get no customers row.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']) || u.app_meta,
  jsonb_build_object('display_name', u.name), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'customer@mibarra.test', 'Test Customer', '{}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'owner@mibarra.test', 'Test Owner', '{"account_type":"staff"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'manager@mibarra.test', 'Test Manager', '{"account_type":"staff"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a4'::uuid, 'barista@mibarra.test', 'Test Barista', '{"account_type":"staff"}'::jsonb)
) as u (id, email, name, app_meta);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users
where email like '%@mibarra.test';

insert into public.shop_members (shop_id, user_id, role, invited_by) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'owner', null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a3', 'manager', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a4', 'barista', '00000000-0000-4000-8000-0000000000a3');
