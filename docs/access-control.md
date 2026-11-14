# Access control

Who can see and do what in MiBarra. The database is the real lock: the rules below are enforced with
row level security (RLS) policies and database functions in
`supabase/migrations/20261114100000_access_control.sql`. The dashboard and the app hide controls a role
can't use (`packages/shared/src/permissions.ts`), but only the database stops a request that someone sends by hand.

## User types

| Type | Who they are | Scope of access | Stored in |
| :--- | :--- | :--- | :--- |
| **Customer** | Anyone using the public app | Only their own orders, loyalty cards, and profile | `customers` |
| **Barista** | Staff who prepare and hand over orders | One shop's orders, sold-out toggles, and QR scanning | `shop_members` with role `barista` |
| **Manager** | Runs the shop day to day | One shop: menu, offers, reports, and baristas | `shop_members` with role `manager` |
| **Owner** | The business owner | Every shop they own, including settings and staff | `shop_members` with role `owner` |
| **Platform admin** | MiBarra | All shops, for setup and support, with every action logged | `platform_admins` |

Platform admins are added with direct database access (`insert into public.platform_admins (user_id) values (...)`).

## Tables

| Table | Purpose | Key fields |
| :--- | :--- | :--- |
| `shop_members` | Links a staff login to a shop with a role | `user_id`, `shop_id`, `role` (`owner`, `manager`, `barista`), `active`, `invited_by`, `created_at`. One row per user per shop |
| `platform_admins` | Logins that can act across all shops | `user_id`, `created_at` |
| `audit_log` | Append-only record of sensitive actions | `user_id`, `shop_id`, `action`, `target`, `details`, `time`. Rows can't be updated or deleted |
| `loyalty_scans` | One row per QR scan, so a retried scan never stamps or redeems twice | `card_id`, `shop_id`, `customer_id`, `staff_id`, `action` (`stamp`, `redeem`), `idempotency_key` |

`shops.suspended` marks a shop a platform admin suspended: it is closed, hidden from customers, and its staff
can't reopen it.

## Permission matrix

"Own shop" means only the shops where the person has that role. "Own" means only rows that belong to that person.

| Action | Customer | Barista | Manager | Owner | Platform admin | Enforced by |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Browse menus and open shops | Yes | Yes | Yes | Yes | Yes | RLS (`shops`, `menu_*` are public; suspended shops are hidden) |
| Place, cancel, and view own orders | Own | No | No | No | No | `place_order()`, `cancel_order()`, RLS on `orders` |
| View a shop's orders | No | Own shop | Own shop | Own shop | Yes | RLS on `orders`, `order_items` |
| Change order status and mark paid | No | Own shop | Own shop | Own shop | No | RLS + column privilege on `orders.status`, `mark_order_paid()` |
| Cancel an order after preparation starts, or refund | No | No | Own shop | Own shop | No | `cancel_order()`, `refund_order()` (logged) |
| Mark items sold out | No | Own shop | Own shop | Own shop | No | `set_item_available()`, `set_option_available()` |
| Open or close the shop | No | No | Own shop | Own shop | No | `set_shop_open()` |
| Scan QR codes to stamp or redeem | No | Own shop | Own shop | Own shop | No | `scan_loyalty_card()` |
| Edit menu and prices | No | No | Own shop | Own shop | Yes | RLS on `menu_categories`, `menu_items`, `item_options` (admin edits are logged) |
| Create offers | No | No | Own shop | Own shop | No | Not built yet: there is no offers table |
| Change loyalty rules | No | No | No | Own shop | No | `set_loyalty_rule()` (logged) |
| View sales reports | No | Daily count only | Own shop | Own shop | Yes | `shop_daily_order_count()`, `shop_sales_report()` (admin views are logged) |
| See customer name and phone | Own | Name only | Own shop | Own shop | Yes, logged | RLS on `customers`, `shop_customer_names()`, `admin_customer_contact()` (logged) |
| Invite or remove staff | No | No | Baristas only | Own shop | Yes | `staff-invite` edge function + `add_shop_member()`, `remove_shop_member()` (logged) |
| Edit shop profile, payment provider, and billing | No | No | No | Own shop | Yes | `update_shop_profile()`, `set_shop_payment_provider()` (logged) |
| Create or suspend shops | No | No | No | No | Yes | `admin_create_shop()`, `admin_set_shop_suspended()` (logged) |

## How it is enforced

- **Customers**: policies check that the row's `customer_id` (or `id` for `customers`) is the signed-in user.
- **Staff**: policies call `has_shop_role(shop_id, roles)`, which uses `shop_role(shop_id)` to look up the person's
  **active** row in `shop_members`. The role is looked up on every request instead of being stored in the login
  token, so setting `active = false` (what `remove_shop_member()` does) ends access at once.
- **Platform admins**: `is_platform_admin()` checks `platform_admins`. Admins can read every shop's orders, edit
  menus, and use the admin functions. Their writes and their access to customer contact details are logged.
- **Sensitive actions run on the server.** Refunds, late cancellations, payment settings, loyalty rules, staff
  changes and admin actions only run through `security definer` functions. Each one checks the role again and
  writes to `audit_log` in the same transaction, so there is never a change without its log entry.
  Direct writes to `shops`, `shop_members`, `platform_admins`, `loyalty_cards`, `loyalty_scans`, `order_items` and
  `audit_log`, and inserts or deletes on `orders`, are revoked for app users.
- **Totals and stamps stay on the server.** App users can only update `orders.status`, and a trigger blocks
  cancelling or reopening an order that way. Prices and totals come from `place_order()`; stamps come from
  completed orders or `scan_loyalty_card()`.
- **Retries are safe.** Cancelling, refunding and marking paid twice changes nothing the second time and adds no
  second log entry. A QR scan sends an `idempotency_key`, so a retried scan stamps or redeems only once.

## Customer and staff accounts

- Customers sign up in the app. Their login gets a `customers` row.
- Staff logins are created only by the `staff-invite` edge function, from an invitation by an owner, a manager
  (baristas only) or a platform admin. The login is marked `app_metadata.account_type = 'staff'`, which only the
  server can set, so it gets no `customers` row and can't place orders. `isStaffAccount()` in `@mibarra/shared`
  lets the apps send each kind of login to its own sign-in screen (the dashboard sign-in is described below).
- Nobody can turn a customer account into a staff account. Users can't write to `shop_members`, and
  `add_shop_member()` (server only) rejects logins that have a `customers` row.

### The staff-invite function

`POST /functions/v1/staff-invite` with `{ "shopId": "<uuid>", "role": "owner" | "manager" | "barista", "email": "..." }`
and the inviter's login token.

1. Validates the input.
2. First check, as the inviter: `can_invite_staff(shop, role)`.
3. Looks up the email. A customer login is rejected. A new email gets a staff login.
4. Second check, in the database: `add_shop_member(actor, shop, user, role)` checks the inviter's role again,
   adds or reactivates the membership and writes `staff.invite` to `audit_log`.
5. Emails an invitation link (redirects to `STAFF_INVITE_REDIRECT_URL`). People who already have an active
   staff login (for example at another shop) aren't emailed; they sign in as usual.

Calling it again for the same person and role is safe. It doesn't add them twice, and it resends the email
if they haven't accepted the invitation yet.

## Audit log actions

| Action | When |
| :--- | :--- |
| `order.cancel` | A manager or owner cancels an order |
| `order.cancel_pending` | A barista cancels an order before preparation |
| `order.refund` | A manager or owner refunds an order |
| `shop.payment_provider` | The payment provider changes |
| `shop.loyalty_rule` | The loyalty rule changes |
| `staff.invite`, `staff.remove` | Someone is added to or removed from a shop |
| `admin.*` | Any platform admin action: shop create, suspend or restore, profile edits, menu edits, viewing customer contact details, viewing reports |

Owners read their shop's entries. Platform admins read all of them.

## Tests

`supabase/tests/database/access_control.test.sql` signs in as each role and checks the rules. For example, a
customer can't read another customer's orders, a barista can't edit prices, staff at shop A can't see shop B, a
removed barista loses access immediately, and retries don't double count. Run it with local Supabase running:

```sh
npm run db:start
npm run test:db
```

## Not covered yet

- **Offers**: there is no offers table yet, so "Create offers" has nothing to protect.
- **Billing**: there are no billing fields yet. The payment provider is covered.
- **Platform admin reads through RLS** (orders, menus) can't be logged per row. Access to customer contact
  details and to reports goes through logged functions. Admin access in the MVP is direct database access.
- **Baristas and order totals**: baristas can see each order's total, because they take payment. "Daily count
  only" applies to reports.
- **Screens**: the customer login (#20) is a separate story. It should use `isStaffAccount()` and the permission
  helpers in `@mibarra/shared`.

## Dashboard sign-in (#21)

The dashboard signs in with Supabase email and password, then calls `dashboard_access()`. It returns one row per
active shop membership (owner, manager, barista) plus a `platform_admin` row for platform admins. No rows
(customers, deactivated staff) means the dashboard signs the user out again and shows "Esta cuenta no tiene
acceso al panel". The check lives in `packages/shared/src/dashboardAccess.ts` and
`apps/dashboard/src/logic/staffAuth.ts`; data stays protected by RLS regardless of the screen.
Tests: `supabase/tests/database/dashboard_access.test.sql`.
