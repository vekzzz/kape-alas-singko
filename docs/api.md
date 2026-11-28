# Kapé Alas-Singko — API plan

The HTTP API the frontend and the staff board talk to. The database behind it is in [erd.md](erd.md).

## Conventions

- Base path `/api/v1`. `GET /health` stays at the root (Render's health check).
- Real `application/json` in and out. CORS allows the origins in `FRONTEND_ORIGIN` only.
- Timestamps are ISO-8601 UTC. Money is **integer centavos** (`17000` = ₱170); the client formats it.
- Every request and response shape is a zod schema in `packages/contract`, imported by both sides. The backend validates with it, the frontend parses replies with it.
- Errors always look like this:

```json
{ "error": { "code": "PRICE_CHANGED", "message": "Prices changed while you were ordering.", "fields": { "phone": "Use a number like 0917 123 4567" } } }
```

`fields` appears only for validation errors (`400 VALIDATION`).

- Staff routes need `Authorization: Bearer <session token>`. Missing or expired gives `401 UNAUTHENTICATED`.
- Rate limits: `POST /orders` about 10 per minute per IP, `POST /staff/login` stricter. Over the limit gives `429 RATE_LIMITED`.
- An order is identified by its `publicId` (128-bit random, base64url) everywhere, for customers and staff. The short `number` (`A5-K7P`) is for calling out at the counter and repeats every day, so it is never used to look an order up.

## Public

### `GET /api/v1/menu`

Everything the menu stage needs, nested, with an `ETag` (`If-None-Match` gives `304`).

```json
{
  "groups": [{ "id": "espresso", "name": "Espresso bar", "tagline": "…", "morningPosition": 0, "afternoonPosition": 1 }],
  "optionGroups": [{ "id": "size", "label": "Size", "kind": "single", "values": [{ "id": 1, "code": "regular", "label": "Regular", "priceDeltaCentavos": 0 }] }],
  "items": [{
    "id": "latte", "groupId": "espresso", "name": "Latte", "description": "…", "note": null,
    "basePriceCentavos": 17000, "tone": "#dba785", "stageBackground": "#dca845", "stageInk": "#2b1400",
    "art": "cup", "coffeeRatio": null, "icedOnly": false, "isSoldOut": false,
    "options": [{ "optionGroupId": "size", "defaultValueId": 1 }]
  }]
}
```

Only active items are returned. The client sorts groups by `morningPosition` or `afternoonPosition` depending on the Manila hour (11 AM to 6 PM is the afternoon order).

### `GET /api/v1/shop`

```json
{
  "name": "Kapé Alas-Singko", "address": "Magsaysay Avenue, Naga City", "timezone": "Asia/Manila",
  "acceptingOrders": true, "slotMinutes": 15, "minLeadMinutes": 10,
  "openingHours": [{ "weekday": 0, "opensAt": "05:00", "closesAt": "21:00", "isClosed": false }],
  "closures": [{ "date": "2026-12-25", "reason": "Christmas Day" }]
}
```

`closures` lists upcoming dates only. The client keeps the live "Open now / first pour in 2 h" ticker, computed from these hours.

### `GET /api/v1/pickup-slots`

Server-computed slots. They cover the current business day, or, when none are left, the **next open day** (skipping closures and closed weekdays, up to 7 days ahead). Never two days at once. When `acceptingOrders` is false the list is empty.

```json
{ "date": "2026-11-28", "slots": [{ "pickupAt": "2026-11-28T01:15:00Z" }] }
```

`POST /orders` checks `pickupAt` with the same function.

## Customer

### `POST /api/v1/orders`

Header `Idempotency-Key: <uuid>`, one per checkout attempt. Sending the same key again returns the original order (`200`) instead of creating a second one.

```json
{
  "orderType": "take-out", "name": "Maria", "phone": null,
  "pickupAt": "2026-11-28T01:15:00Z",
  "lines": [{ "itemId": "latte", "options": { "size": "large", "milk": "oat" }, "note": "less ice", "quantity": 2 }],
  "expectedTotalCentavos": 48000
}
```

- `name` is required, max 30. `phone` is optional, `09XXXXXXXXX` when given (the client normalizes `+639…` first).
- Options use option-group ids as keys and value codes as values. Missing groups take the item's default.
- The server recomputes every price from the menu, writes the snapshots, assigns the order number, and records the first `received` event with actor `customer`.

Reply `201`:

```json
{
  "publicId": "k3T…", "number": "A5-K7P", "status": "received", "orderType": "take-out",
  "name": "Maria", "pickupAt": "2026-11-28T01:15:00Z", "placedAt": "2026-11-28T00:50:00Z",
  "totalCentavos": 48000, "paid": false,
  "lines": [{ "itemName": "Latte", "optionLabels": ["Large", "iced", "oat milk"], "note": "less ice", "quantity": 2, "unitPriceCentavos": 24000, "lineTotalCentavos": 48000 }],
  "events": [{ "status": "received", "at": "2026-11-28T00:50:00Z" }]
}
```

`409` codes:

| Code | Meaning | Client does |
| --- | --- | --- |
| `PRICE_CHANGED` | `expectedTotalCentavos` does not match the recomputed total | refetch menu, show the new total |
| `ITEM_UNAVAILABLE` | an item or option is sold out, inactive or unknown (names listed in `error.details`) | refetch menu, drop or edit the line |
| `SLOT_UNAVAILABLE` | `pickupAt` is not a valid slot any more | refetch slots, ask to pick again |
| `ORDERS_PAUSED` | `acceptingOrders` is false | show the paused message |

Each code gets a friendly message in the site's voice. Failed requests keep the customer's cart.

### `GET /api/v1/orders/:publicId`

Same shape as the `201` reply, with the current `status`, `cancelReason` (when cancelled) and a timestamp per step in `events`. `404 NOT_FOUND` for an unknown id. This is the endpoint customers poll.

### `POST /api/v1/orders/:publicId/cancel`

Allowed only while the status is `received`. Writes a `cancelled` event with actor `customer` and `cancel_reason = customer_request`. Later states reply `409 CANNOT_CANCEL`. Returns the order.

## Staff

### Auth

| Endpoint | What |
| --- | --- |
| `POST /staff/login` `{ email, password }` | Replies `{ token, staff: { id, name, role }, expiresAt }`. Argon2id check. Also runs the phone cleanup. |
| `POST /staff/logout` | Revokes the session. |
| `GET /staff/me` | The logged-in staff member. |

**As built (slice 4).** `POST /staff/login` and the board endpoints answer as sketched, with these details: login is limited to 10 attempts per 15 minutes per address; `GET /staff/me` replies `{ staff, expiresAt }`; `POST /staff/logout` replies `{ ok: true }`; status and payment replies are the updated staff order; a `409 STATUS_CONFLICT` carries the current order in `details.order`; the `cursor` runs 5 seconds behind the server clock and the board replaces orders by `publicId`; a cancelled order cannot be paid (`409 INVALID_TRANSITION`). The status rules live in `packages/contract/src/staff.ts` so the board only offers moves the server allows.

Tokens are opaque and random. Only their SHA-256 hash is stored in `staff_sessions`. Sessions last 12 h and extend while in use. The first manager is created with `npm run staff:create`. `STAFF_TOKEN` is removed.

### `GET /api/v1/staff/orders?date=YYYY-MM-DD&since=<cursor>`

Orders for one business day (default today in Manila), soonest pickup first, with lines, payment state and events. With `since` (an `updatedAt` cursor from the previous reply), only orders changed after it come back. Reply: `{ orders: [...], cursor: "…" }`.

### `POST /api/v1/staff/orders/:publicId/status`

```json
{ "from": "preparing", "to": "ready" }
```

For cancelling, `{ "from": "received", "to": "cancelled", "reason": "sold_out" }` with `reason` one of `sold_out`, `customer_request`, `no_show`, `other`.

Allowed moves: one step forward (`received → preparing → ready → collected`), one step back (undo a mis-tap), and `cancelled` from any state before `collected`. The update only applies `WHERE status = from`. If someone else changed it first, the reply is `409 STATUS_CONFLICT` with the current order. Each change writes an event with actor `staff` and the staff id. Anything else is `400 INVALID_TRANSITION`.

### `POST /api/v1/staff/orders/:publicId/payment`

`{ "method": "cash" | "gcash" }` sets `payment_method` and `paid_at`. Payment never blocks a status change. The board shows an "unpaid" badge until it is set.

### `PATCH /api/v1/staff/menu-items/:id`

`{ "isSoldOut": true }`. The only menu field staff can change in v1.

### `PATCH /api/v1/staff/shop`

`{ "acceptingOrders": false }` pauses or resumes online orders.

## Polling rules

| Who | What | How often |
| --- | --- | --- |
| Customer | `GET /orders/:publicId` for each tracked order | every 15 s; stops at `collected` or `cancelled`, or 2 h after pickup |
| Customer | `GET /menu`, `GET /shop` | on tab focus and every 60 s while open |
| Staff board | `GET /staff/orders?since=` | every 5 s |

The board being open also keeps the free Render API awake during a shift. When the board sees a new `received` order, it plays a chime and flashes the tab title. Browsers only allow sound after a tap, so the board starts with a "Start shift" button.

Menu and shop are cached by TanStack Query and persisted to localStorage for 24 h, so a returning visitor sees the last menu instantly while it refreshes. The welcome screen renders without waiting for data; the menu stage waits for the first fetch. Checkout always uses live data, and the 409 codes catch stale prices.

## Frontend changes

- `VITE_ORDER_ENDPOINT` becomes `VITE_API_URL` (base URL).
- **TanStack Query** holds server state: menu, shop, slots and order polling (`refetchInterval`).
- **zustand + `persist`** holds client state: the cart, the order type and the order history, with versioned storage keys. It replaces `CartProvider`, `cartReducer`, `cartStorage`, `orderHistory` and `useOrderStatuses`. Saved cart lines are checked against the menu once it loads.
- `data/menu.ts`, `STAGE_COLORS`, the id checks in `pickVessel`, `pickupSlots.ts` and the hours constants in `time.ts` are deleted once the API serves them.
- A real `cancelled` state: the tracker shows a message per reason, the orders pill drops the order, and polling stops.
- The staff board is a second Vite entry, `frontend/staff.html`, sharing the API client and the contract package (it has its own stylesheet). **As built (slice 5):** it is served at `/staff`; Vite does that rewrite in dev and preview, and the static host needs the same rule (Render: rewrite `/staff` to `/staff.html`, slice 6).

## Backend stack

Node 20+, Express 5, TypeScript, Drizzle ORM with drizzle-kit migrations, Postgres on Neon free, zod v4, helmet, express-rate-limit, pino-http. Env vars are validated with zod at boot. Migrations run at the start of the API's start command (Render's pre-deploy commands are paid-only), against Neon's direct connection when `MIGRATION_DATABASE_URL` is set. Tests use vitest and supertest against a real Postgres (docker compose locally, a service container in CI); price and slot logic also get pure unit tests. The root `package.json` becomes an npm workspace with `backend`, `frontend` and `packages/contract`.

## Build order

One feature branch and PR per slice. The frontend keeps working at every merge.

1. **Foundation.** Workspaces, `packages/contract`, Drizzle schema for the whole ERD, migrations (old `orders` table dropped), `npm run seed`, docker compose, vitest harness.
2. **Read APIs + frontend data switch.** `/menu`, `/shop`, `/pickup-slots`. TanStack Query and zustand on the frontend. Local menu and time data removed.
3. **Orders.** `POST /orders` with server pricing, idempotency and the 409s. `GET` and cancel by `publicId`. Checkout, tracker and cancelled UI on the frontend.
4. **Staff API.** Auth, sessions, `staff:create`, the board endpoints, sold-out and pause, phone cleanup.
5. **Staff board UI.** `staff.html`, new-order chime, "Done today" section.
6. **Deploy** (done: `render.yaml`, Neon, the production bundle, CI; see "Deploying" in the root README).
   Originally:  Neon database, `render.yaml` rewrite (build from the repo root, remove the Render DB), env vars, README updates.

## Out of scope for v1

Customer accounts, push notifications to closed pages, SSE or WebSockets, per-slot capacity limits, menu and price editing in the UI (seed or SQL until the manager admin), order history, search and reports on the board, online payment, OpenAPI docs.
