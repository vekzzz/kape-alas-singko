# Backend

Express 5 + TypeScript + Postgres (Drizzle ORM) API for Kapé Alas-Singko. The plan it is built from is in [docs/api.md](../docs/api.md) (endpoints, rules, build order) and [docs/erd.md](../docs/erd.md) (database).

## Status

Built in slices. **Slices 1 to 3 are done:** the database, the public read endpoints, and customer orders. Staff (login, the order board, status changes, payment, sold-out, pause) arrive in slices 4 and 5, so for now **nothing moves an order past `received`** except edits in the database.

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

## Tests

`npm test -w backend` runs vitest against a real Postgres. `test/globalSetup.ts` creates `kape_test` if needed, wipes it and applies the migrations once per run, so keep it separate from your dev database. It refuses to touch a database whose name does not contain "test". Set `TEST_DATABASE_URL` to use another server.

The schema tests check what only a real database can: unique order numbers per business day, composite foreign keys (a line cannot have two milks or a value from the wrong group), and the cancel-reason, payment and phone rules.

## Environment

Checked with zod at boot (see [src/env.ts](src/env.ts)); a bad value stops the server with a clear message.

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (required) |
| `DATABASE_SSL` | `true` for hosted Postgres that needs SSL (Neon, Render) |
| `PORT` | Port to listen on, default 3000 |
| `FRONTEND_ORIGIN` | Comma-separated origins allowed by CORS. Empty means no browser origin is allowed |
| `LOG_LEVEL` | `info` (default), `debug`, `warn`, `error` or `silent` |
| `TRUST_PROXY` | `true` behind a proxy such as Render, so the order rate limit sees real visitor addresses. Default `false` |
