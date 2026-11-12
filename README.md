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

npm workspaces tie everything together. UI screens are placeholders; the real UI comes in a separate PR.

## Getting started

Requirements: Node 22.18+ (see `.nvmrc`), Docker (for local Supabase).

```sh
npm install                 # first time; creates package-lock.json. Afterwards use `npm ci`
(cd apps/mobile && npx expo install --fix)      # align Expo package versions with the installed SDK
(cd apps/dashboard && npx expo install --fix)
npm run db:start            # local Supabase; prints the API URL and anon key
cp apps/mobile/.env.example apps/mobile/.env        # paste the URL + anon key
cp apps/dashboard/.env.example apps/dashboard/.env
npm run functions:serve     # edge functions on http://127.0.0.1:54321/functions/v1
npm run mobile              # customer app (Expo dev server, port 8081)
npm run dashboard           # shop dashboard (web, port 8082)
```

## Scripts

| Command | What it does |
| --- | --- |
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
