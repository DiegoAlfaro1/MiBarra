# MiBarra — Design handoff

MiBarra is a coffee pre-order app shared by many coffee shops: customers order ahead, the shop gets the order live on a dashboard, and stamps are earned automatically. These 21 screens are the design reference for the MVP described in *Coffee Pre-Order App: MVP Plan*.

## How to use these files

- Each `*.dc.html` file is **one screen**: HTML with inline styles, plus a small `class Component` script at the bottom that holds sample data and interactions (selected options, quantities, status changes).
- They were made in a design canvas and reference `./support.js` (the canvas runtime), so **they won't render on their own by double-clicking**. Treat them as readable source: layout, copy, colors, spacing and behavior are all in the file.
- `{{name}}` placeholders are filled in by `renderVals()` in the same file. `<sc-for>` is a loop, `<sc-if>` is a condition, and `<a href="X.dc.html">` is navigation to screen X.
- All shop names, prices, people and dashboard numbers are **sample data**. Replace them with the real café's menu.
- Interface language: Spanish (NFR-09). Currency: lempiras (L).

## Design tokens

| Token | Value | Use |
|---|---|---|
| ink | `#1C1917` | Text, primary dark buttons, dark cards |
| background | `#F7F5F2` | App background (dashboard uses `#F1EFEC`) |
| surface | `#FFFFFF` | Cards, sheets |
| border | `#E7E5E4` | Card borders, dividers |
| muted text | `#57534E` | Secondary text |
| accent | `#B4441B` | Brand / primary actions (per-shop color in the future) |
| accent tint | `#F8E6DC` | Item photo placeholders, stamp hint |
| success | `#15803D` / tint `#DCFCE7` / dark `#14532D` | Open, Ready, Paid, reward |
| danger | `#B91C1C` / tint `#FEE2E2` | Closed, Cancel |
| warning | `#F59E0B` border / `#FEF3C7` bg / `#78350F` text | Sold out after added to cart, notes |
| demo | `#1D4ED8` / tint `#EFF6FF` | "DEMO" labels on simulated payments |

- **Fonts:** Bricolage Grotesque 600/700 for headings and numbers; Inter 400–700 for everything else (both on Google Fonts).
- **Radii:** 10–14 px for controls, 16–24 px for cards, 999 px for pills.
- **Touch targets:** 44 px minimum on the customer app, 48–60 px on the dashboard (busy hands, NFR-08).
- **Icons:** simple 2 px stroke line icons (a library such as Lucide matches the style).

## Screens

### Mobile app (customer) — `mobile/`, 390 × 844

| # | File | Screen | What it shows | Requirements |
|---|---|---|---|---|
| 01 | `Main.dc.html` | Home / shops | Greeting, search, stamp-progress card, list of shops in the network with open status, distance and wait time; bottom tab bar | ORD-11 (Full), LOY-03, MNU-05 |
| 02 | `Menu.dc.html` | Shop menu | Shop header, category tabs (working), items with price, sold-out items greyed with "Agotado hoy", floating cart bar | ORD-01, MNU-02, MNU-04 |
| 03 | `Item.dc.html` | Customize drink | Size, milk and extras with price changes, quantity stepper, live total | ORD-02, MNU-03 |
| 04 | `Cart.dc.html` | Cart | Edit/remove lines, quantities, note to shop, "+1 stamp" hint, total. Tweak `soldOutWarning` shows the sold-out-after-adding banner | ORD-03, edge case: item sells out in cart |
| 05 | `Login.dc.html` | Sign up at checkout | Phone (+504) or email, name, password, stay signed in, switch to log in | ACC-01, ACC-02, ACC-03 |
| 06 | `Checkout.dc.html` | Pickup time & payment | Time slots incl. "ASAP" and a full slot, pay at counter or demo card form | ORD-04, ORD-05, PAY-01, PAY-02, PAY-03, MNU-10 (Full) |
| 07 | `Tracking.dc.html` | Live order status | Received → Preparing → Ready (tweak `status`), cancel allowed only while Received | ORD-06, ORD-07, NOT-01 |
| 08 | `Loyalty.dc.html` | Stamp cards | Per-shop card with 8 stamps, QR code, "Add to Wallet" preview, other shops' cards | LOY-01, LOY-03, LOY-05, LOY-06, LOY-12 (Full) |
| 09 | `Reward.dc.html` | Redeem reward | Large QR + code for the free drink, reset note | LOY-04 |
| 10 | `Orders.dc.html` | Order history | Active order card, past orders with status and stamps earned, "Order again" | ORD-08, ORD-09 (Full) |
| 11 | `ShopClosed.dc.html` | Edge: shop closed | Menu visible but ordering disabled; tweak `reason` = closed or paused by shop | MNU-05, SHP-11 (Full), edge case: shop closed |
| 12 | `Cancelled.dc.html` | Edge: order cancelled | Cancelled by shop (with reason) or by customer (tweak `cancelledBy`); no charge, no stamp | SHP-04, ORD-07, LOY-02 |

**Main flow:** Main → Menu → Item → Cart → Login → Checkout → Tracking. Tab bar: Inicio (Main), Pedidos (Orders), Sellos (Loyalty), Perfil (Login).

### Web app (customer) — `web/`, fluid page, designed at 1440 wide

| # | File | Screen | What it shows | Requirements |
|---|---|---|---|---|
| W1 | `WebHome.dc.html` | Home / explore | Header + nav, hero with search, stamp card, shop grid with filters (working), how-it-works, "Join MiBarra" for shops | ORD-11 (Full), LOY-03, ADM-08 (Full) |
| W2 | `WebShop.dc.html` | Menu + cart | Category side nav, item grid, side cart panel; clicking an item opens a customize dialog and adds it to the cart (working) | ORD-01, ORD-02, ORD-03, MNU-04 |
| W3 | `WebCheckout.dc.html` | Pickup & payment | Time slots, payment method with demo card form, name + phone for WhatsApp, order summary | ORD-04, ORD-05, PAY-01–PAY-03 |
| W4 | `WebTracking.dc.html` | Live order status | Horizontal progress (tweak `status`), order + pickup details, stamp preview | ORD-06, ORD-07, NOT-01 |
| W5 | `WebAccount.dc.html` | Stamps & history | Tabs: stamp cards + account QR, or order history table with "Order again" | LOY-03, ORD-08, ORD-09 (Full) |

Layouts use `flex-wrap` and `auto-fill` grids, so they stack on phone widths.

### Shop dashboard — `dashboard/`, fluid page, designed at 1280 wide (tablet or phone)

| # | File | Screen | What it shows | Requirements |
|---|---|---|---|---|
| D1 | `DashOrders.dc.html` | Live orders | New-order alert banner with sound icon, open/pause switch, today's counts, three columns: New / Preparing / Ready. One-tap status advance, "Cobrado" (mark paid), WhatsApp notify when Ready, cancel with reason dialog (all working) | SHP-01–SHP-06, NOT-02, NOT-03, MNU-05, ANA-01 |
| D2 | `DashMenu.dc.html` | Menu availability | Every item with a one-tap sold-out switch (working) | MNU-04, SHP-06 |
| D3 | `DashScan.dc.html` | Scan QR | Camera viewfinder placeholder + scanned customer card; add a stamp for an in-store purchase or redeem a full card (working; tweak `scanned`) | SHP-07, LOY-04, LOY-05 |
| D4 | `DashSummary.dc.html` | Daily summary | Sales, orders, average ticket, stamps, payment split bar, recent orders table | ANA-01 (ANA-02+ are Full) |

Dashboard nav: Pedidos (D1), Menú (D2), Escanear (D3), Resumen (D4).

## Notes for implementation

- **Statuses:** orders go `received → preparing → ready → collected` (or `cancelled`), with payment status `unpaid | paid | failed | refunded` (PAY-04). Collecting an order adds one stamp; cancelling adds none (LOY-02).
- **Demo labeling:** anything simulated (card payment, Wallet pass) carries a blue "DEMO" / "VISTA PREVIA" badge, per the MVP principle "fake things are labeled".
- **Per-shop branding:** every screen exposes `accent` as one color, so a shop's own color can be swapped in later.
- **Photos:** item images are placeholders (cup icon on a tinted tile). Use the café's real photos.
- **"Full" items:** a few elements beyond the MVP are included on purpose (shop distance/map list, order again, multi-shop stamp wallet, join-as-a-shop link). Drop them for the first demo if you want the tightest scope.

## Suggested Claude Code prompt

> Read `design/README.md` and the `*.dc.html` files in `design/mobile`, `design/web` and `design/dashboard`. They are HTML mockups of MiBarra. First create a shared theme (colors, fonts, radii, spacing) from the README's design tokens. Then build the customer app in Expo (React Native with web export as a PWA) to match the mobile screens 01–12, using mock data, following the main flow Main → Menu → Item → Cart → Login → Checkout → Tracking. Keep the Spanish copy exactly as written.
