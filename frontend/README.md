# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City. One product fills the screen at a time; customers swipe through the menu, build their drink, and pick it up at the counter.

It starts like a fast-food kiosk: a welcome screen asks **Dine in** or **Take out** (changeable later from the header, remembered for the browser session). Checkout runs in the order panel one step at a time: review the order, then details (name and ready time), then a big order number to show at the counter.

Built with React 19, TypeScript, Vite and Motion. The menu, prices, opening hours and pickup times come from the API in `../backend` (`VITE_API_URL`). The cart and your recent orders live in `localStorage`, and orders are paid at the counter.

## Where the data comes from

- **Server data** (TanStack Query, `src/api/`): `GET /api/v1/menu`, `/shop` and `/pickup-slots`, checked against the zod schemas in `@kape/contract`. The menu and shop are looked at again every minute and when the tab comes back. They are also saved to `localStorage` for 24 hours, so a returning customer sees the last menu straight away while the new one loads. Pickup times are never saved.
- **The first visit** can be slow, because the free API host sleeps when idle. The welcome screen shows at once, with a placeholder where the hours go. The menu stage says it is warming up, or offers a retry if the API cannot be reached.
- **Browser state** (zustand with `persist`, `src/cart/`): the cart, the orders placed in this browser, and dine in or take out for the session. Storage keys are versioned.
- **Prices** arrive as integer centavos and are shown in pesos. The server recomputes every price when an order is placed.

## Placing and tracking orders

Checkout sends the cart to `POST /api/v1/orders` as item ids and option choices (`{ itemId: "latte", options: { size: "large", milk: "oat" } }`), never prices. The server prices the order itself and replies with the receipt: the order number, a long unguessable `publicId`, the lines as saved, and the total. `expectedTotalCentavos` is the total the customer saw, so the server can say "that changed" instead of charging a different amount.

- **Retries are safe.** Each distinct order gets its own `Idempotency-Key`; sending the same order again (a double tap, or a reply lost on a slow connection) returns the first order instead of making another. Change the cart or the pickup time and the key changes too.
- **When the server says no**, the customer keeps their cart and sees a plain message (`src/lib/orderErrors.ts`): prices changed (with the new total), an item is no longer available, the pickup time passed, online orders are paused, or too many orders from one place. The menu or pickup times are fetched again so the screen catches up.
- **Tracking.** Each order is looked up by its `publicId` (`GET /api/v1/orders/:publicId`) every 15 seconds and whenever the tab comes back, until it is collected, cancelled, or two hours past its pickup time. News is saved into the order store, so every screen reads one copy. The orders pill in the corner shows orders on the way; tapping it opens each with its number, progress and receipt. The browser keeps up to five orders.
- **Ready alert.** When an order turns `ready`, the pill turns dark and pulses, and the customer also gets a system notification (if they tapped "Let me know when it's ready" and allowed it), a vibration, a chime and a flag in the tab title. This happens once per order.
- **Cancelling.** While an order is still `received`, its card offers "Cancel this order" (two taps). Once the bar starts on it, the server refuses and the customer is sent to the counter. A cancelled order, whether by the customer or the bar, shows its own message and stops being checked.

The page has to stay open in the customer's browser for the alert to arrive: sending a push to a closed page would need a push server, which this project does not have. Some mobile browsers, Chrome on Android among them, only show system notifications from a service worker. On those browsers the customer still gets the chime, the vibration and the banner.

## The staff board

The bar's order screen is a second page of the same app: `staff.html`, served at `/staff` (in dev and `vite preview` a small plugin in `vite.config.ts` does the rewrite; the host needs the same rule). It has its own entry (`src/staff/main.tsx`) and its own stylesheet (`src/staff/staff.css`), so the customer app's look and bundle are untouched. It shares the API client, the contract package and the time helpers.

- **Signing in.** Email and password go to `POST /api/v1/staff/login`. The token is kept in `localStorage`, so a reload or a sleeping tablet does not end the shift; if the server says the session is over (401), the board drops back to the sign-in screen.
- **Start shift.** Browsers only allow sound after a tap, so the board opens with a "Start shift" button that unlocks audio. After that, a new order plays a chime and, if the tab is in the background, puts the number of new orders in the tab title. The first load is what was already there, so it does not chime. "Test sound" plays it again.
- **The queue.** Three columns (New, Making, Ready) with the soonest pickup first, and "Done today" for collected and cancelled orders. It asks the API every 5 seconds, even in a background tab, and after the first load only for what changed since the last reply (`?since=`), merging by `publicId`. If the day rolls over it asks for the whole new day. If the connection drops, the last board stays on screen with an "Offline, trying again" note.
- **A ticket** shows the order number, name, dine in or take out, phone (tap to call), pickup time ("in 12 min", "5 min late"), each line with its choices and note, the total, and whether it is paid. Buttons: the next step, "Back to…" to undo a mis-tap, "Cancel…" with a reason (we ran out, customer asked, no-show, other), and "Paid Cash" or "Paid GCash". Buttons wait for the server and then show its answer straight away.
- **Two people at once.** Each press says what status the board thinks the order has. If someone else already moved it, the board shows the order as it really is and a message names what happened, instead of undoing their work.
- **Menu and pause.** "Menu" lists every item with a switch for sold out. "Pause online orders" asks twice and then shows a red banner with a Resume button. Both take effect at once for checkout.

Everything the board decides about moves (one step forward or back, cancel before collected) comes from the same rules the server enforces, in `packages/contract/src/staff.ts`.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (Vitest)
npm run build     # type-check, then production build in dist/
npm run preview   # serve the production build
```

## Project layout

```
src/
  main.tsx                  Entry point
  App.tsx                   Page shell: welcome or stage, the two side panels, ready banner
  styles.css                All styles (plain CSS with custom properties)

  api/                      Talking to the backend
    client.ts               apiGet and apiPost: fetch, timeout, errors, zod parsing
    orders.ts               postOrder, fetchOrder, cancelOrder
    queries.ts              The menu, shop and pickup-slot queries and how often they refresh
    queryClient.ts          Query client and the saved (24 h) menu and shop cache
    hooks.ts                useMenu, useShop, usePickupSlotsQuery

  data/menu.ts              Turns the API menu into the Catalog the screens use: items, groups, defaults, extras
  data/CatalogContext.ts    The loaded menu for components (useCatalog)

  lib/                      Plain functions, no React
    pricing.ts              Drink options, prices, cart line type
    time.ts                 Manila time and time formatting
    pickupSlots.ts          Labels the pickup times the server offers
    orders.ts               Building the order request, phone numbers, whether an order is finished
    orderErrors.ts          What to tell the customer when placing or cancelling fails
    readyAlert.ts           Notification, chime and vibration when it is
    shop.ts                 Open now or closed, hours text, map link, from the shop's hours
    flyToCart.ts            The "added to cart" animation

  cart/                     Cart state
    cartReducer.ts          Every change to the cart goes through here
    cartStore.ts            The cart (zustand, saved to localStorage)
    cartStorage.ts          Checks saved cart lines are well formed
    orderStore.ts           Orders placed in this browser, as the API sent them (zustand, saved)
    orderHistory.ts         Each order is kept until two hours after pickup, at most five
    orderTypeStore.ts       Dine in or take out, for this browser session
    useCart.ts              Read and update the cart from any component

  hooks/useNow.ts           The current time, refreshed every 20 seconds
  hooks/useOrderTracking.ts Looks up each order on the way until it is finished, and sounds the ready alert

  staff/                    The bar's order board (staff.html)
    main.tsx                Entry point for /staff
    StaffApp.tsx            Sign in, or the board
    Board.tsx               Header, columns, Done today, Start shift, messages
    OrderTicket.tsx         One order and its buttons
    ShopControls.tsx        Pause online orders, mark items sold out
    boardData.ts            Merging polls, grouping into columns, pickup timing (plain functions)
    useBoard.ts             Polls the API; chimes on new orders
    useOrderActions.ts      Move, cancel and pay buttons
    sessionStore.ts         The signed-in barista (zustand, saved)
    staffAlert.ts           Unlocking audio, the chime, the tab title
    staff.css               The board's styles

  components/
    stage/                  The main screen
      MenuStage.tsx         Holds the current product and wires up swipe, keys and wheel
      StageHeader.tsx       Brand, open/closed status, cart button
      ItemTitle.tsx         Product name
      ProductShowcase.tsx   The large draggable product
      StageBackdrop.tsx     Ring, disc and splash behind the product
      BuyPanel.tsx          Price, description, add to order
      MenuRail.tsx          Scrolling strip of every product
    product-art/            SVG drawings of every product
      ProductArt.tsx        Side view, picks the right vessel
      ProductIcon.tsx       Small top view for lists
      vessels/              Cup, mug, glass, French press, pour-over
      pastries/             Plate, bread roll, each pastry
    welcome/                Dine in / Take out start screen
    customize/              Size, temperature, milk and extra shot form
    order/                  Cart review, pickup form, order cards, progress tracker, the orders pill
    ui/                     Generic pieces: Modal, QuantityStepper
```

Tests sit next to the file they test (`pricing.ts` → `pricing.test.ts`).

## Common changes

| To change | Edit |
| --- | --- |
| A product's name, price, description or page colours | `backend/src/seed/data.ts`, then `npm run db:seed` |
| Add a product | Add it to `MENU_ITEMS` in `backend/src/seed/data.ts` with an `art` the frontend can draw, then reseed |
| Extra costs (large, oat milk, extra shot) | The option values in `backend/src/seed/data.ts` |
| Shop address and hours | The database (`shop_settings`, `opening_hours`, `shop_closures`), and the JSON-LD in `index.html` |
| How a drink is drawn | `src/components/product-art/` |

## Conventions

- Text on the page talks to the customer: second person, friendly and short ("We've got your order!", "What name should we call out?").

- Components are function components, one per file, named after the file.
- Business rules (prices, hours, slots) live in `lib/` as plain functions so they can be tested without React.
- The cart only changes through `cartReducer` actions; components call `dispatch` from `useCart()`.
- Page colours come from two CSS variables, `--bg` and `--ink`, set by `MenuStage` for the current product. Every other colour in `styles.css` is mixed from those two.
- The cart storage key is versioned (`alas-singko-cart-v2`). Bump it whenever the shape of a cart line changes, so old saved carts are dropped instead of breaking the page.

## Notes

- On Windows with Git Bash, run the tests from a path with an upper-case drive letter (`F:\...`, e.g. from PowerShell). Started from `/f/...`, Vitest loads itself twice and every test file fails with `Cannot read properties of undefined (reading 'config')`.
