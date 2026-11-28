# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City, plus the API that receives and tracks the orders.

```
packages/   Shared code (`@kape/contract`: zod schemas used by both sides)
frontend/   React 19 + TypeScript + Vite customer app   (see frontend/README.md)
backend/    Express + Postgres order API                (see backend/README.md)
render.yaml Render blueprint: the API and the static site (the database is on Neon)
```

## Run both locally

You need Node 20+ and Docker (for Postgres). It is an npm workspace, so install once from the repo root:

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run db:up               # Postgres in Docker, localhost:5433
npm run db:migrate          # create the tables
npm run db:seed             # load the menu and shop hours
npm run dev:backend         # http://localhost:3000
npm run dev:frontend        # http://localhost:5173 (second terminal)
```

The API is being built in slices (see [docs/api.md](docs/api.md)); customer ordering and the staff board work end to end, and the whole thing deploys (see below).

## How they connect

The frontend reads the menu, hours and pickup times from `VITE_API_URL`, places orders with `POST /api/v1/orders` and checks on each one by its `publicId` every 15 seconds. The bar runs on the staff board at `/staff` (sign in, a live queue with a new-order chime, status and payment buttons, sold-out and pause controls). Create a staff account first with `npm run staff:create -- --name "Ana" --email ana@example.com`. The endpoints are in [backend/README.md](backend/README.md) and the plan they came from is in [docs/api.md](docs/api.md).

## Deploying

The API and the site go on **Render** (free plan), the database on **Neon** (free). `render.yaml` describes the two Render services. A free Render Postgres is deleted after 30 days, which is why the database is Neon.

### 1. The database (Neon)

1. Create a project at [neon.com](https://neon.com), in a region near Naga (Singapore). Create or keep the default database.
2. Copy two connection strings from the dashboard's **Connect** panel: the **pooled** one (the host has `-pooler` in it) and the **direct** one. The app uses the pooled string; migrations use the direct one, as Neon advises.

### 2. Create the tables, menu and a staff account (once, from your computer)

The free Render plan has no shell, so do this from your own machine against Neon. Use the direct string, and leave `backend/.env` alone so no production secret is written to a file.

```bash
# Git Bash / macOS / Linux. In PowerShell: $env:DATABASE_URL = "..."; $env:DATABASE_SSL = "true"
export DATABASE_URL="<direct connection string>"
export DATABASE_SSL=true

npm run db:migrate                                   # create the tables
npm run db:seed                                      # load the menu, prices and opening hours
npm run staff:create -- --name "Ana" --email ana@example.com --role manager   # asks for a password
```

The API also runs the migrations every time it starts, so later schema changes need no manual step. Seeding is only needed again when the menu in `backend/src/seed/data.ts` changes.

### 3. The API and the site (Render)

1. In Render choose **New → Blueprint**, point it at this repository, and apply. It reads `render.yaml` and asks for the values marked "sync: false":

   | Service | Variable | Value |
   | --- | --- | --- |
   | kape-api | `DATABASE_URL` | Neon **pooled** string |
   | kape-api | `MIGRATION_DATABASE_URL` | Neon **direct** string |
   | kape-api | `FRONTEND_ORIGIN` | the site's address, e.g. `https://kape-frontend.onrender.com` |
   | kape-frontend | `VITE_API_URL` | the API's address, e.g. `https://kape-api.onrender.com` |

   Render shows each service's address once it exists. If a guess was wrong, correct the variable and deploy again. `VITE_API_URL` is baked into the site when it is built, so changing it means a new build (the build stops with a clear message if it is empty).
2. When both services are live, check:
   - `https://<api>/health` answers `{"ok":true}`;
   - `https://<api>/api/v1/menu` lists the menu;
   - the site shows the welcome screen, then the menu, and an order can be placed and tracked;
   - `https://<site>/staff` shows the sign-in page, and the account from step 2 gets the board with that order.

The other settings in `render.yaml` are already right for Render: `TRUST_PROXY=true` (so the order and sign-in limits count real visitors), `DATABASE_SSL=true` (encrypted, certificate checked), and the migrations run at the start of the API's start command because pre-deploy commands are paid-only.

### Running it for real: what to know

- **First load after a quiet spell is slow.** The free API sleeps after about 15 minutes without traffic and takes about 30 seconds to wake; the Neon database also sleeps after about 5 minutes and wakes in a second or two. Returning customers see the menu they saw last (it is saved in their browser) while it wakes. A staff board left open during opening hours keeps the API awake. Both limits go away on paid plans.
- **Free tiers are for a trial.** Check Render's and Neon's current free limits (hours, storage, connections) before relying on them for a live shop.
- **Change the menu or prices:** edit `backend/src/seed/data.ts`, deploy, then run `npm run db:seed` as in step 2. Sold-out marks and the pause switch are never undone by seeding.
- **Change the hours or add a closure:** edit `opening_hours` or `shop_closures` in Neon's SQL editor (seeding never overwrites them).
- **Add staff:** `npm run staff:create` as in step 2. **Remove someone:** in Neon's SQL editor, `update staff set is_active = false where email = '...'`; their session stops working at once.
- **Staff passwords** are stored as argon2id hashes. There is no "forgot password" screen: create the account again under a new email, or ask whoever has database access to set `is_active = false` and recreate it.
- **Security basics already in place:** HTTPS from Render and Neon, a CORS allowlist, rate limits on orders and sign-in, sessions that end after 12 hours, and customer phone numbers cleared 30 days after an order is done. The board keeps its sign-in token in the browser's `localStorage`, so use it on the bar's own device.
