# Backend

Express 5 + TypeScript + Postgres (Drizzle ORM) API for Kapé Alas-Singko. The plan it is built from is in [docs/api.md](../docs/api.md) (endpoints, rules, build order) and [docs/erd.md](../docs/erd.md) (database).

## Status

Built in slices. **Slices 1 and 2 are done:** the database schema, migrations, seed and test harness, and the three public read endpoints below, which the frontend now uses for its menu, hours and pickup times.

Orders and staff arrive in slices 3 and 4, so for now **the API does not receive orders**. The old `POST /orders` and `GET /orders?number=` routes, and the old single `orders` table, are gone. The frontend still posts orders to the old webhook until slice 3 switches it to the new API.

## Endpoints

| Method | Path | What |
| --- | --- | --- |
| GET | `/health` | Liveness check for Render. Does not touch the database. |
| GET | `/api/v1/menu` | Groups, option groups with prices, and active items with their options and defaults. Has an `ETag`, so `If-None-Match` gets a `304`. |
| GET | `/api/v1/shop` | Name, address, time zone, opening hours, upcoming closures, `acceptingOrders`, slot length and lead time. |
| GET | `/api/v1/pickup-slots` | The times a customer can pick up right now: the rest of today, or the next open day. Empty while orders are paused. Never cached. |

Prices are integer centavos. The reply shapes are zod schemas in `packages/contract/src/read.ts`. The slot rules are a pure function in `src/domain/pickupSlots.ts`, worked out in the shop's time zone from the hours, closures and lead time.

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
