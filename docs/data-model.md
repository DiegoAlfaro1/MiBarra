# MiBarra data model

The MVP data model lives in Supabase (Postgres). The source of truth is `supabase/migrations`
(`20261112000000_init.sql`, then `20261114000000_data_model.sql`, then `20261114100000_access_control.sql`); the matching TypeScript types are in
`packages/shared/src/types.ts`. A test (`packages/shared/src/data-model.test.ts`) fails if the two drift apart.

Conventions:

- **Money** is stored as integer cents (`price_cents`, `total_cents`, ...). The default currency is `HNL` (lempiras).
- **Ids** are UUIDs. `customers.id` is the same id as the login in `auth.users`.
- **Row level security (RLS)** is enabled on every table. Clients can never write orders or loyalty data directly.

## Entity relationship diagram

```mermaid
erDiagram
    shops ||--o{ menu_categories : has
    shops ||--o{ menu_items : sells
    menu_categories ||--o{ menu_items : groups
    menu_items ||--o{ item_options : "has sizes and extras"
    shops ||--o{ shop_members : employs
    customers ||--o{ orders : places
    shops ||--o{ orders : receives
    orders ||--|{ order_items : contains
    menu_items ||--o{ order_items : "ordered as"
    customers ||--o{ loyalty_cards : owns
    shops ||--o{ loyalty_cards : issues

    shops {
        uuid id PK
        text name
        text logo_url
        text address
        text phone "E.164"
        jsonb hours
        boolean is_open
        text payment_provider
        int loyalty_stamps_required "loyalty rule"
        text loyalty_reward
        char currency "default HNL"
    }
    menu_categories {
        uuid id PK
        uuid shop_id FK
        text name
        int sort_order
    }
    menu_items {
        uuid id PK
        uuid shop_id FK
        uuid category_id FK
        text name
        text description
        int price_cents
        text photo_url
        boolean available
    }
    item_options {
        uuid id PK
        uuid item_id FK
        text kind "size or extra"
        text name
        int price_change_cents
        boolean available
    }
    customers {
        uuid id PK "same as auth.users.id"
        text name
        text email
        text phone
    }
    shop_members {
        uuid shop_id PK
        uuid user_id PK
        text role "owner, manager or barista"
        boolean active
        uuid invited_by
    }
    orders {
        uuid id PK
        uuid shop_id FK
        uuid customer_id FK
        text status
        timestamptz pickup_time
        int total_cents
        text payment_status
        text note
        uuid idempotency_key
        timestamptz loyalty_awarded_at
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid item_id FK
        int quantity
        jsonb chosen_options "snapshot"
        int unit_price_cents "price at order time"
    }
    loyalty_cards {
        uuid id PK
        uuid customer_id FK
        uuid shop_id FK
        int stamps
        int rewards_available
        text qr_code_value
    }
```

## Tables

| Table | Purpose | Key fields and rules |
| :--- | :--- | :--- |
| `shops` | One row per coffee shop | `name`, `logo_url` (http(s) link), `address`, `phone` (E.164, e.g. `+50422223333`), `hours` (JSON per weekday: `mon`..`sun`, each `null` = closed or `{"open": "07:00", "close": "19:00"}` in 24h time with open before close; checked by `shop_hours_valid()`), `timezone` (IANA name the hours are in, default `America/Tegucigalpa`), `is_open` (manual open/closed switch; orders are accepted only while it is on AND the current time is inside `hours`, checked by `shop_within_hours()` in `place_order`; `set_shop_open()` refuses to turn it on outside the hours and `close_shops_outside_hours()` turns it off when they end, scheduled every minute with pg_cron), `payment_provider` (`cash`, `stripe`, `paypal`, `other`), loyalty rule: `loyalty_stamps_required` + `loyalty_reward` (null = no program) |
| `menu_categories` | Groups of items | `shop_id`, `name` (unique per shop, ignoring case and outer spaces), `sort_order` |
| `menu_items` | Items for sale | `category_id`, `name`, `description`, `price_cents` (HNL), `photo_url` (http(s) link; uploaded photos live in the `assets` bucket under `shops/<shop_id>/menu/`), `available`. `shop_id` is kept too and a composite foreign key guarantees the category belongs to the same shop |
| `item_options` | Sizes and extras | `item_id`, `kind` (`size`/`extra`), `name` (not blank, unique per item and kind, ignoring case and outer spaces), `price_change_cents` (may be negative, at most L 99,999.99 either way), `available`. When an item has sizes on sale, every order line for it must carry exactly one size (trigger `check_order_item_size()` on `order_items`, run inside `place_order`); extras are any number. If an item has sizes but all are sold out, it cannot be ordered at all |
| `customers` | App users | `name`, `email` and/or `phone` (at least one), `id` = login id. Created automatically when someone signs up |
| `orders` | One per order | `shop_id`, `customer_id`, `status` (`pending` → `preparing` → `ready` → `completed`, or `cancelled`), `pickup_time`, `total_cents`, `payment_status` (`pending`, `paid`, `failed`, `refunded`), `note` (max 280), `idempotency_key` |
| `order_items` | Lines in an order | `order_id`, `item_id`, `quantity` (1-99), `chosen_options` (snapshot of name and price change), `unit_price_cents` (price at time of order, options included) |
| `loyalty_cards` | One per customer per shop | `customer_id`, `shop_id`, `stamps`, `rewards_available`, `qr_code_value` (unguessable, unique). `unique (customer_id, shop_id)` |
| `shop_members` | Which logins work at which shop | `shop_id`, `user_id`, `role` (`owner`, `manager`, `barista`), `active`, `invited_by`. One row per user per shop. See [access-control.md](access-control.md) |

## How an order is created (idempotent)

Orders are created only by the `place_order` database function, called from the `place-order` edge function.
Prices always come from the menu, never from the app.

```mermaid
sequenceDiagram
    participant App as Customer app
    participant Fn as place-order edge function
    participant DB as place_order() in Postgres

    App->>App: Generate idempotency key once per checkout attempt
    App->>Fn: shopId, items (+ optionIds), idempotencyKey
    Fn->>Fn: Validate input
    Fn->>DB: place_order(...) as the signed-in customer
    alt key already used by this customer
        DB-->>Fn: Original order (no new row)
    else shop open and items available
        DB->>DB: Price items and options from the menu
        DB->>DB: Insert order + order_items (price snapshot)
        DB-->>Fn: New order
    else closed shop or unavailable item
        DB-->>Fn: Error with a user-facing message
    end
    Fn-->>App: Order or error
```

`unique (customer_id, idempotency_key)` also protects against two retries racing each other.

## Loyalty stamps

A shop's rule is "a reward every N completed orders" (`loyalty_stamps_required`). When an order moves to
`completed`, a trigger gives the customer one stamp. `orders.loyalty_awarded_at` is set in the same step
and only the first transition can set it, so changing the status back and forth never awards twice.

```mermaid
stateDiagram-v2
    [*] --> pending: order placed
    pending --> preparing
    preparing --> ready
    ready --> completed: stamp awarded once
    pending --> cancelled
    preparing --> cancelled
    completed --> [*]
    cancelled --> [*]
```

For example with `loyalty_stamps_required = 8`, the 8th completed order resets `stamps` to 0 and adds 1 to
`rewards_available`. Cancelled orders never earn a stamp.

## Who can read and change what (RLS)

Roles, the permission matrix, the RLS policies and the functions for sensitive actions are documented in
[access-control.md](access-control.md).

Extra protections:

- No client can insert or delete orders, order lines or loyalty cards. They don't have the database privilege,
  and there is no policy for it.
- Signed-in clients only have the database privilege to update `orders.status`. A trigger also rejects changes to
  totals, owner, pickup time, note and payment status, and blocks cancelling or reopening an order with a plain
  update (use `cancel_order()`). Payment status changes go through `mark_order_paid()` and `refund_order()`, or
  server-side code using the service role (for example a payment webhook).
- Orders and their lines are never deleted when a menu item changes: items that were ordered cannot be deleted,
  they are marked `available = false` instead.

## Sign-up

The app calls `supabase.auth.signUp` with an email or an E.164 phone (`+504…`) plus a password, and passes the name as
`options.data.display_name`. The `handle_new_user` trigger copies name, email and phone into `customers`. Email and phone
are unique, so the same contact cannot register twice. Local config (`supabase/config.toml`) has phone sign-up enabled
without an SMS provider and a minimum password length of 8. The uppercase and special-character rules are checked in the
app only. Email/phone verification is a future item.

## Not covered yet

- Setting `pickup_time` and `note` through the edge function (the database function already supports them).
- Calling a payment provider and updating `payment_status`.
