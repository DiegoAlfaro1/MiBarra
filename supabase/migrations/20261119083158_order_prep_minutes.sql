-- Order status change (#60): each shop says how long an order usually takes to prepare.
-- The customer app uses it to estimate when an order moves to "preparing" and "ready";
-- staff can always move the order earlier from the dashboard. Default is 5 minutes.
alter table public.shops
  add column prep_minutes int not null default 5
    check (prep_minutes between 1 and 120);
