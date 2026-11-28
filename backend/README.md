# Backend

Express 5 + TypeScript + Postgres (Drizzle ORM) API for Kapé Alas-Singko. The plan it is built from is in [docs/api.md](../docs/api.md) (endpoints, rules, build order) and [docs/erd.md](../docs/erd.md) (database).

## Status

Built in slices, all done: the database, the public read endpoints, customer orders, the staff API, the staff board screen (`/staff` in the frontend), and deployment (see "Deploying" in the [root README](../README.md)).

## Endpoints

| Method | Path | What |
| --- | --- | --- |
| GET | `/health` | Liveness check for Render. Does not touch the database. |
| GET | `/api/v1/menu` | Groups, option groups with prices, and active items with their options and defaults. Has an `ETag`, so `If-None-Match` gets a `304`. |
| GET | `/api/v1/shop` | Name, address, time zone, opening hours, upcoming closures, `acceptingOrders`, slot length and lead time. |
| GET | `/api/v1/pickup-slots` | The times a customer can pick up right now: the rest of today, or the next open day. Empty while orders are paused. Never cached. |
| POST | `/api/v1/orders` | Place an order. Needs an `Idempotency-Key` header. `201` with the order, or `200` with the original when the key was used before. |
| GET | `/api/v1/orders/:publicId` | The order with its status and a time for each step. This is what customers poll. |
| POST | `/api/v1/orders/:publicId/cancel` | Cancel an order, only while it is still `received`. |

Prices are integer centavos. Every request and reply shape is a zod schema in `packages/contract/src`, shared with the frontend. Errors look like `{ "error": { "code", "message", "fields?", "details?" } }`.

### Staff

Everything under `/api/v1/staff` except login needs `Authorization: Bearer <token>`.

| Method | Path | What |
| --- | --- | --- |
| POST | `/staff/login` | `{ email, password }` gives `{ token, staff, expiresAt }`. |
| POST | `/staff/logout` | Ends the session. |
| GET | `/staff/me` | Who the token belongs to, and when it expires. |
| GET | `/staff/orders?date=&since=` | One business day's orders (default today), soonest pickup first, with the customer's phone and payment. With `since` (the `cursor` from the last reply) only orders that changed after it. |
| POST | `/staff/orders/:publicId/status` | `{ from, to, reason? }`. One step forward or back, or `cancelled` with a reason. |
| POST | `/staff/orders/:publicId/payment` | `{ method: "cash" \| "gcash" }`. |
| PATCH | `/staff/menu-items/:id` | `{ isSoldOut }`. |
| PATCH | `/staff/shop` | `{ acceptingOrders }`: pause or resume online orders. |

- **Accounts.** There is no sign-up. Create one with `npm run staff:create -- --name "Ana" --email ana@example.com --role manager`; it asks for the password (at least 10 characters) without echoing it. Passwords are stored as argon2id hashes. `barista` and `manager` can do the same things for now.
- **Sessions.** The token is 256 random bits; only its SHA-256 hash is stored, so a copy of the database cannot be used to sign in. A session lasts 12 hours and is pushed forward while it is used (at most once a minute, so the board's polling does not write every few seconds). Logging out ends it. A wrong password, an unknown email and a switched-off account all get the same answer in about the same time. Sign-in is limited to 10 attempts per 15 minutes per address.
- **Status moves** are checked by the shared rules in `packages/contract/src/staff.ts`. The caller says what it thinks the status is (`from`) and the update only applies if that is still true, so two baristas, a stale board, or a barista and a customer cancelling at the same instant cannot step on each other: the loser gets `409 STATUS_CONFLICT` with the order as it now is in `details.order`. Every change is written to the order's history with the staff member's id. A skipped step or a move from `cancelled` is `400 INVALID_TRANSITION`.
- **Polling.** `cursor` runs 5 seconds behind the server clock, so an order saved a moment before the poll is never missed; the board should replace orders by `publicId`, since a few come back twice.
- **Payment** is separate from status and never holds an order up. Paying again corrects the method and keeps the first time. A cancelled order cannot be paid.
- **Sold out and pause** take effect at once for checkout (`ITEM_UNAVAILABLE`, `ORDERS_PAUSED`); customers' screens catch up within a minute.
- **Tidying.** There is no scheduler on the free host, so when someone signs in the server clears customers' phone numbers 30 days after their order was collected or cancelled, and deletes sessions that ended over a week ago.

### Placing an order

The request names items and choices, not prices: `{ orderType, name, phone | null, pickupAt, lines: [{ itemId, options: { size: "large" }, note, quantity }], expectedTotalCentavos }`. The server:

1. returns the original order if the `Idempotency-Key` was already used (even if orders have since been paused);
2. refuses with `409 ORDERS_PAUSED` or `409 SLOT_UNAVAILABLE` (the time must be one `GET /pickup-slots` offers right now);
3. prices every line from the menu. An item that is unknown, hidden or sold out, or a choice the item does not offer, gives `409 ITEM_UNAVAILABLE` with the names in `details.items`;
4. compares its total with `expectedTotalCentavos`, and gives `409 PRICE_CHANGED` with `details.totalCentavos` if they differ;
5. saves the order, its lines (name and price copied, so later menu changes do not rewrite it), the chosen options and the first status event in one transaction. The order number (`A5-K7P`) is drawn by the server and is unique per pickup day; on a clash it draws again.

A choice switched off (no extra shot) is not saved, so receipts only list what was chosen. Bad input gives `400 VALIDATION` with `fields` naming each problem. Placing orders is limited to 10 a minute per address (`429 RATE_LIMITED`); set `TRUST_PROXY=true` behind Render so the limit counts real visitors.

Customers find an order by its `publicId` (128 random bits), never by its short number, which repeats every day and is easy to guess.

## Setup

You need Node 20+ and Docker (for the local Postgres), run from the repo root:

```bash
npm install                       # installs all workspaces
cp backend/.env.example backend/.env
npm run db:up                     # Postgres 17 in Docker, on localhost:5433
npm run db:migrate                # applies backend/drizzle/*.sql
npm run db:seed                   # menu, option prices, shop hours
npm run staff:create -- --name "Ana" --email ana@example.com --role manager
npm run dev:backend               # http://localhost:3000
npm test                          # frontend, contract and backend tests
```

Docker publishes Postgres on port **5433**, not 5432, so it does not fight with a Postgres you may already have installed.

## Database

- The schema is written in TypeScript in [src/db/schema.ts](src/db/schema.ts). Money is integer centavos.
- After changing it, run `npm run db:generate` and commit the new file in `drizzle/`. Migrations run with `npm run db:migrate`, and the deploy runs them before starting.
- `drizzle/0000_foundation.sql` starts by dropping the old single-table `orders` (it only held trial data).
- The menu lives in [src/seed/data.ts](src/seed/data.ts), ported from the frontend's old `menu.ts`, `STAGE_COLORS` and `pickVessel`. `npm run db:seed` is safe to repeat:
  - menu content (names, prices, options, colours) is updated to match the file;
  - `is_sold_out` and `is_active` are left alone, because staff change them;
  - shop settings and opening hours are only created when missing, so edits in the database survive.

## Production build

`npm run build -w backend` typechecks, then bundles the API with esbuild into `backend/dist/` (plain JavaScript; `@kape/contract` is bundled in and everything else stays an import from `node_modules`). Run it the way Render does:

```bash
npm run start:prod -w backend   # migrates, then starts: node dist/migrate.js && node dist/index.js
npm run seed:prod -w backend    # node dist/seed.js
npm run staff:create:prod -w backend -- --name "Ana" --email ana@example.com
```

The `:prod` scripts need the environment variables set (they do not read `.env`). The database pool is small (5), waits up to 15 seconds for a sleeping database to wake, and logs instead of crashing when an idle connection is dropped, which Neon does when it suspends.

CI (`.github/workflows/ci.yml`) typechecks, runs every test suite against a real Postgres, builds, and then starts the production bundle and checks it answers.

## Tests

`npm test -w backend` runs vitest against a real Postgres. `test/globalSetup.ts` creates `kape_test` if needed, wipes it and applies the migrations once per run, so keep it separate from your dev database. It refuses to touch a database whose name does not contain "test". Set `TEST_DATABASE_URL` to use another server.

The schema tests check what only a real database can: unique order numbers per business day, composite foreign keys (a line cannot have two milks or a value from the wrong group), and the cancel-reason, payment and phone rules.

## Environment

Checked with zod at boot (see [src/env.ts](src/env.ts)); a bad value stops the server with a clear message.

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (required) |
| `MIGRATION_DATABASE_URL` | Optional direct (not pooled) connection string. `migrate`, `seed` and `staff:create` use it when set. With Neon, `DATABASE_URL` is the pooled string and this is the direct one |
| `DATABASE_SSL` | `true` for hosted Postgres (Neon, Render): encrypted, and the certificate is checked. `no-verify` encrypts without checking, for a self-signed certificate. `false` (default) for local |
| `PORT` | Port to listen on, default 3000 |
| `FRONTEND_ORIGIN` | Comma-separated origins allowed by CORS. Empty means no browser origin is allowed |
| `LOG_LEVEL` | `info` (default), `debug`, `warn`, `error` or `silent` |
| `TRUST_PROXY` | `true` behind a proxy such as Render, so the order rate limit sees real visitor addresses. Default `false` |
