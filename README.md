# MiBarra
Coffee shop app to order drinks and loyalty rewards

## Stack

| Part | Tech | Where |
| --- | --- | --- |
| Customer app (iOS, Android, web) | Expo + React Native + expo-router | `apps/mobile` |
| Shop dashboard (web) | Expo web + expo-router | `apps/dashboard` |
| Shared code (types, Supabase client, order client) | TypeScript | `packages/shared` |
| Database, auth, realtime | Supabase (Postgres + RLS) | `supabase/migrations` |
| Server code | Supabase Edge Functions (Deno) | `supabase/functions` |
| Web hosting | Cloudflare Pages | `apps/*/wrangler.toml` |

The database tables, relationships and access rules are documented in [docs/data-model.md](docs/data-model.md).

npm workspaces tie everything together. UI screens are placeholders; the real UI comes in a separate PR.

## Getting started

Requirements: Node 22.18+ (see `.nvmrc`), Docker Desktop running (for local Supabase). No Supabase or Cloudflare account needed.

```sh
npm ci           # once
npm run dev      # terminal 1: Supabase, edge functions, dashboard (Ctrl+C stops them)
npm run mobile   # terminal 2: customer app; scan the QR code with Expo Go, or press w for web
```

`npm run dev` starts local Supabase (migrations and seed are applied on first start), writes each app's `.env.development.local` with the Supabase URL and anon key, then runs the edge functions and the dashboard. The Supabase URL uses your PC's network IP so a phone can reach it; if it picks the wrong network adapter, run `DEV_HOST=<your-ip> npm run dev`.

To use the app on a phone, the phone must be on the same Wi-Fi, and Windows Firewall must allow Node and Docker on private networks (ports 8081 and 54321).

| What | URL |
| --- | --- |
| Customer app (web) | http://localhost:8081 |
| Shop dashboard | http://localhost:8082 |
| Supabase Studio (database admin) | http://localhost:54323 |
| Edge functions | http://127.0.0.1:54321/functions/v1 |

Test logins (password `password123`): `customer@mibarra.test` (customer) and `owner@mibarra.test` (owner of the demo shop).

`npm run dev:stop` shuts down Supabase's Docker containers.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `dev:stop` | Start / stop everything locally (see above) |
| `npm test` | Unit tests (Node's built-in test runner, runs TypeScript directly) |
| `npm run lint` | ESLint (`eslint-config-expo`) |
| `npm run typecheck` | `tsc` in every workspace |
| `npm run db:reset` | Recreate the local DB from migrations + `supabase/seed.sql` |
| `npm run deploy:mobile` / `deploy:dashboard` | Export the web build and upload it to Cloudflare Pages |

## Data model and security

Defined in `supabase/migrations/20261112000000_init.sql`.

- **Roles**: anyone signed in is a customer; `shop_staff` makes a user an `owner` or `barista` of a shop.
- **Row level security** is on for every table. Customers see only their own orders and points; staff see their shop's. Only owners edit menus and staff.
- **Orders** can only be created with the `place_order` function (called by the `place-order` edge function). Prices come from the `products` table, not from the client. Each checkout sends an `idempotencyKey`, and `(customer_id, idempotency_key)` is unique, so a retried request returns the original order instead of creating a second one.
- **Loyalty points** are an append-only ledger (`loyalty_ledger`, balances in the `loyalty_balances` view). `unique (order_id, reason)` stops points from being awarded twice for the same order. The earning rules aren't defined yet.
- **Realtime**: `orders` is in the `supabase_realtime` publication; `apps/dashboard/src/hooks/useLiveOrders.ts` shows how to subscribe.

## Deploying

- **Supabase**: `npx supabase link --project-ref <ref>`, `npx supabase db push`, `npx supabase functions deploy place-order`. Set `ALLOWED_ORIGIN` with `npx supabase secrets set` to the customer web app's Pages domain (the default is `*`).
- **Cloudflare Pages**: `npx wrangler login`, then `npm run deploy:mobile` / `npm run deploy:dashboard`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the environment when building, because they are inlined at build time.
