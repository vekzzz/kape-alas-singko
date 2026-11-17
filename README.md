# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City. One product fills the screen at a time; customers swipe through the menu, build their drink, and pick it up at the counter.

Built with React 19, TypeScript, Vite and Motion. No backend: the cart lives in `localStorage` and orders are paid at the counter.

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
  App.tsx                   Page shell: the stage plus the two side panels
  styles.css                All styles (plain CSS with custom properties)

  data/menu.ts              Menu items, groups and lookups. Edit the menu here.

  lib/                      Plain functions, no React
    pricing.ts              Drink options, prices, cart line type
    time.ts                 Opening hours and Manila time
    pickupSlots.ts          Pickup times offered at checkout
    flyToCart.ts            The "added to cart" animation

  cart/                     Cart state
    cartReducer.ts          Every change to the cart goes through here
    cartStorage.ts          Saving and loading from localStorage
    CartProvider.tsx        Provides the cart to the app
    useCart.ts              Read and update the cart from any component

  hooks/useManilaMinutes.ts Current Manila time, refreshed every 20 seconds

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
    customize/              Size, temperature, milk and extra shot form
    order/                  Cart review, pickup form, confirmation
    ui/                     Generic pieces: Modal, QuantityStepper
```

Tests sit next to the file they test (`pricing.ts` → `pricing.test.ts`).

## Common changes

| To change | Edit |
| --- | --- |
| A product's name, price or description | `src/data/menu.ts` |
| Add a product | Add it to `MENU_ITEMS` in `src/data/menu.ts`, give it page colours in `stage/stageColors.ts`, and check how `product-art/artUtils.ts → pickVessel` draws it |
| Extra costs (large, oat milk, extra shot) | `EXTRA_COSTS` in `src/lib/pricing.ts` |
| Opening hours | `OPENING_TIME` and `CLOSING_TIME` in `src/lib/time.ts` |
| How a drink is drawn | `src/components/product-art/` |

## Conventions

- Components are function components, one per file, named after the file.
- Business rules (prices, hours, slots) live in `lib/` as plain functions so they can be tested without React.
- The cart only changes through `cartReducer` actions; components call `dispatch` from `useCart()`.
- Page colours come from two CSS variables, `--bg` and `--ink`, set by `MenuStage` for the current product. Every other colour in `styles.css` is mixed from those two.
- The cart storage key is versioned (`alas-singko-cart-v2`). Bump it whenever the shape of a cart line changes, so old saved carts are dropped instead of breaking the page.

## Notes

- On Windows with Git Bash, run the tests from a path with an upper-case drive letter (`F:\...`, e.g. from PowerShell). Started from `/f/...`, Vitest loads itself twice and every test file fails with `Cannot read properties of undefined (reading 'config')`.
