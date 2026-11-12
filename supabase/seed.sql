-- Local development data only (applied by `supabase db reset`).
insert into public.shops (id, name, currency)
values ('00000000-0000-4000-8000-000000000001', 'MiBarra Demo', 'MXN');

insert into public.products (shop_id, name, price_cents) values
  ('00000000-0000-4000-8000-000000000001', 'Espresso', 3500),
  ('00000000-0000-4000-8000-000000000001', 'Cappuccino', 5500),
  ('00000000-0000-4000-8000-000000000001', 'Latte', 6000);
