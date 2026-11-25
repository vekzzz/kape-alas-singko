# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City. One product fills the screen at a time; customers swipe through the menu, build their drink, and pick it up at the counter.

It starts like a fast-food kiosk: a welcome screen asks **Dine in** or **Take out** (changeable later from the header, remembered for the browser session). Checkout runs in the order panel one step at a time: review the order, then details (name and ready time), then a big order number to show at the counter.

Built with React 19, TypeScript, Vite and Motion. No backend of its own: the cart lives in `localStorage` and orders are paid at the counter.

## Receiving orders

Placed orders are POSTed as JSON to the webhook in `VITE_ORDER_ENDPOINT` (copy `.env.example` to `.env`). The body is sent as `text/plain` so a Google Apps Script web app can take it without a CORS preflight; any webhook that reads the raw body works. The payload includes `orderType` (`dine-in` or `take-out`). If the endpoint replies with JSON containing `"number"`, that order number is shown to the customer instead of the one made in the browser. If the request fails, the customer sees an error and keeps their cart.

With no endpoint set, nothing is sent and the confirmation tells the customer to show their screen at the counter.

## Telling customers their order is ready

After an order is sent, the page asks the same endpoint for its status every 15 seconds, with a `GET` request: `VITE_ORDER_ENDPOINT?number=A5-K7P`. The endpoint should reply with JSON like:

```json
{ "status": "ready" }
```

`status` is one of `received`, `preparing`, `ready` or `collected`. Staff move the order along, for example by changing a Status column in the Google Sheet that the Apps Script `doGet` reads.

While the customer keeps browsing, a small pill in the corner shows their orders on the way ("Order A5-K7P · We're making it now"); tapping it opens every order with its number, progress and receipt. The browser keeps up to five orders, each until two hours after its pickup time. When an order turns `ready`, the pill turns dark and pulses, and the customer also gets a system notification (if they tapped "Let me know when it's ready" and allowed it), a vibration, a chime and a flag in the tab title. This happens once per order. Checking stops once the order is `collected`, or two hours after the pickup time.

If the endpoint does not reply with a status, the order screen does not show any tracking. The page has to stay open in the customer's browser for the alert to arrive: sending a push to a closed page would need a push server, which this project does not have. Some mobile browsers, Chrome on Android among them, only show system notifications from a service worker. On those browsers the customer still gets the chime, the vibration and the banner.

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

  data/menu.ts              Menu items, groups and lookups. Edit the menu here.

  lib/                      Plain functions, no React
    pricing.ts              Drink options, prices, cart line type
    time.ts                 Opening hours and Manila time
    pickupSlots.ts          Pickup times offered at checkout
    orders.ts               Order numbers, the payload the bar receives, sending it
    orderStatus.ts          Asking the bar whether an order is ready
    readyAlert.ts           Notification, chime and vibration when it is
    shop.ts                 Address, hours text, map link
    flyToCart.ts            The "added to cart" animation

  cart/                     Cart state
    cartReducer.ts          Every change to the cart goes through here
    cartStorage.ts          Saving and loading from localStorage
    orderHistory.ts         Orders placed in this browser, each kept until two hours after pickup
    orderTypeStorage.ts     Dine in or take out, for this browser session
    CartProvider.tsx        Provides the cart to the app
    useCart.ts              Read and update the cart from any component

  hooks/useManilaMinutes.ts Current Manila time, refreshed every 20 seconds
  hooks/useOrderStatus.ts   Checks each order's status until it is picked up

  components/
    stage/                  The main screen
      MenuStage.tsx         Holds the current product and wires up swipe, keys and wheel
      StageHeader.tsx       Brand, open/closed status, cart button
      ItemTitle.tsx         Product name
      ProductShowcase.tsx   The large draggable product
      StageBackdrop.tsx     Ring, disc and splash behind the product
      BuyPanel.tsx          Price, description, add to order
      MenuRail.tsx          Scrolling strip of every product
      stageColors.ts        Page colours for each product
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
| A product's name, price or description | `src/data/menu.ts` |
| Add a product | Add it to `MENU_ITEMS` in `src/data/menu.ts`, give it page colours in `stage/stageColors.ts`, and check how `product-art/artUtils.ts → pickVessel` draws it |
| Extra costs (large, oat milk, extra shot) | `EXTRA_COSTS` in `src/lib/pricing.ts` |
| Shop address | `SHOP_ADDRESS` in `src/lib/shop.ts` (also the JSON-LD in `index.html`) |
| Opening hours | `OPENING_TIME` and `CLOSING_TIME` in `src/lib/time.ts`, and the JSON-LD in `index.html` |
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
