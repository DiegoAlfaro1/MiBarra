# Menu and shop management module (shared foundation)

Every menu/shop management story builds on these files in `packages/shared/src/`. Add new logic here rather than inside an app, so the dashboard and tests share it.

| File | What it holds |
| --- | --- |
| `menuManagement.ts` | Pure input rules: `validateCategoryInput`, `validateItemInput`, `validateOptionInput`, `MENU_LIMITS`, plus `parseLempiras` (typed price in lempiras → cents) and `lempirasInput`. They return `{ ok: true, value }` or `{ ok: false, errors }` with a user-facing message per field (in Spanish, shown as-is). |
| `menuApi.ts` | Supabase calls: `listMenu`, `create/update/deleteCategory`, `create/update/deleteItem`, `create/update/deleteOption`, `setItemAvailable`, `setOptionAvailable`. They validate first, then call the database, and throw `MenuManagementError` (friendly message, optional `fieldErrors`). |
| `menuManagement.test.ts` | Tests for both files. |
| `shopApi.ts` | Shop profile: `validateShopProfile` (name, logo link, address, phone, hours per weekday), `normalizePhone`/`formatPhone`, `getShop`, `updateShopProfile` (calls `update_shop_profile`, owner only), throws `ShopProfileError`. Tested in `shopApi.test.ts`. |

Rules for the stories that follow:

- Money is integer cents. Forms convert to cents before calling these functions.
- Permissions are enforced by RLS and SQL functions (see `access-control.md`): managers and owners edit the menu, baristas only toggle sold out via `setItemAvailable` / `setOptionAvailable`.
- Items with past orders cannot be deleted; `deleteItem` tells the user to mark them sold out instead.
- The app screens stay in `apps/dashboard`; they call these functions with the `supabase` client from `apps/dashboard/src/lib/supabase.ts`.
- Photos and logos are http(s) links for now (no upload yet); the database refuses anything else.
- Screens: `apps/dashboard/app/shop.tsx` ("Tienda", owner) and `apps/dashboard/app/catalog.tsx` ("Editar menú", owner and manager). Both are responsive down to small phone widths.
- Open/closed and loyalty settings are not wired yet. Their SQL functions exist (`set_shop_open`, `set_loyalty_rule`); add the wrappers to `shopApi.ts` in the story that needs them.
