# Menu and shop management module (shared foundation)

Every menu/shop management story builds on these files in `packages/shared/src/`. Add new logic here rather than inside an app, so the dashboard and tests share it.

| File | What it holds |
| --- | --- |
| `menuManagement.ts` | Pure input rules: `validateCategoryInput`, `validateItemInput`, `validateOptionInput`, `MENU_LIMITS`, plus `parseLempiras` (typed price in lempiras → cents), `parsePriceChange` (signed option price change, empty = 0) and `lempirasInput`. They return `{ ok: true, value }` or `{ ok: false, errors }` with a user-facing message per field (in Spanish, shown as-is). |
| `menuApi.ts` | Supabase calls: `listMenu`, `create/update/deleteCategory`, `create/update/deleteItem`, `create/update/deleteOption`, `setItemAvailable`, `setOptionAvailable`. They validate first, then call the database, and throw `MenuManagementError` (friendly message, optional `fieldErrors`). |
| `menuManagement.test.ts` | Tests for both files. |
| `customerMenu.ts` | The menu as customers see it: `loadShopMenu`, `menuSections` (categories in order, items by name with sold-out ones last, empty categories left out), `isItemSoldOut`, `soldOutLines` / `soldOutMessage` (cart lines that sold out, and the notice), `itemChoices` (pass `{ includeSoldOut: true }` to list sold-out options too, as the dashboard does) / `defaultOptionIds` / `toggleOption` (one size, any extras), `optionChoiceError`, `unitPriceWithOptions`, `describeOptions`, `getMenuItem`. Tested in `customerMenu.test.ts`. |
| `menuPhotos.ts` | `uploadMenuPhoto`: checks the file (JPG, PNG or WebP, max 5 MB), uploads it to `shops/<shop_id>/menu/` in the `assets` bucket and returns the public link to save as `photo_url`. Tested in `menuPhotos.test.ts`. |
| `shopApi.ts` | Shop profile: `validateShopProfile` (name, logo link, address, phone, hours per weekday), `normalizePhone`/`formatPhone`, `getShop`, `updateShopProfile` (calls `update_shop_profile`, owner only), throws `ShopProfileError`. Tested in `shopApi.test.ts`. |

Rules for the stories that follow:

- Money is integer cents. Forms convert to cents before calling these functions.
- Permissions are enforced by RLS and SQL functions (see `access-control.md`): managers and owners edit the menu, baristas only toggle sold out via `setItemAvailable` / `setOptionAvailable`.
- The dashboard "Menú" tab (`apps/dashboard/app/menu.tsx`) is the live sold-out screen for every staff role: one switch per item and one per size/extra (`setItemAvailable` / `setOptionAvailable`).
- Customers see sold-out items marked "Agotado" and cannot open them. An item is sold out when it is marked so, or when all its sizes are sold out (`isItemSoldOut` in `customerMenu.ts`); `menuSections` lists these last. RLS no longer hides them (migration `20261117220000_show_sold_out_items.sql`, #52), and `check_order_item_size()` rejects it with "Some products are sold out.". If something in the cart sells out before checkout, `soldOutLines` / `soldOutMessage` remove it and tell the customer which item it was.
- Items with past orders cannot be deleted; `deleteItem` tells the user to mark them sold out instead.
- The app screens stay in `apps/dashboard`; they call these functions with the `supabase` client from `apps/dashboard/src/lib/supabase.ts`.
- Item photos can be uploaded from "Editar menú" (Subir foto) or pasted as an http(s) link; either way `photo_url` holds an http(s) link and the database refuses anything else. Logos are still links only.
- Sizes and extras are edited inside a saved item in "Editar menú" (`apps/dashboard/src/components/OptionsEditor.tsx`). Each option has a name, a price change (`formatPriceChange` shows `+L 15`, `-L 5` or `Sin costo`) and a sold-out switch, and saves right away. The item list shows a summary line per kind. Option names are unique per item and kind ("Este producto ya tiene una opción con ese nombre.").
- Customers pick exactly one size when the item has sizes on sale, and any extras. The app checks this (`optionChoiceError`) and `place_order` enforces it, so a line can never skip a size or pay for two.
- Category names are unique per shop (ignoring case and outer spaces); a duplicate shows "Ya tienes una categoría con ese nombre." on the name field.
- Customers see the menu in `apps/mobile`: `src/screens/LiveShop.tsx` + `LiveMenu.tsx` (categories as tabs, items with photo and price, sold out and closed states) and `src/screens/LiveItem.tsx` (sizes and extras). Cart lines keep the chosen `optionIds`, and checkout sends them to `place-order`, which prices the order on the server. A suspended shop's menu is hidden by RLS.
- Screens: `apps/dashboard/app/shop.tsx` ("Tienda", owner) and `apps/dashboard/app/catalog.tsx` ("Editar menú", owner and manager). Both are responsive down to small phone widths.
- The open/closed switch is wired in the dashboard header (`shopOpen.ts`). Loyalty settings are not wired yet; the SQL function exists (`set_loyalty_rule`), so add a wrapper to `shopApi.ts` in the story that needs it.
