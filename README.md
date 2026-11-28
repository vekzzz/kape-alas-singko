# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City, plus the API that receives and tracks the orders.

```
packages/   Shared code (`@kape/contract`: zod schemas used by both sides)
frontend/   React 19 + TypeScript + Vite customer app   (see frontend/README.md)
backend/    Express + Postgres order API                (see backend/README.md)
render.yaml Render blueprint: API + Postgres + static site
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

The rebuild of the API is happening in slices (see [docs/api.md](docs/api.md)). Until the order endpoints land, the frontend still talks to the old order contract, which the backend no longer serves.

## How they connect

Today (until slice 3): the frontend POSTs each order to `VITE_ORDER_ENDPOINT` and polls `GET VITE_ORDER_ENDPOINT?number=A5-XXX`, but the backend no longer serves `/orders`, so orders are not received. After slice 3 the frontend uses `VITE_API_URL` and the `/api/v1` endpoints in [docs/api.md](docs/api.md).

## Deploying on Render

> **Out of date until slice 6.** `render.yaml` still describes the old setup (Render Postgres, per-folder builds). The plan moves the database to Neon and builds from the repo root, because the packages are now npm workspaces. Do not deploy from this branch yet.

`render.yaml` describes the API, a Postgres database and the static frontend. After the first deploy, set `VITE_ORDER_ENDPOINT` on the frontend to `https://<api-service>.onrender.com/orders`, set `FRONTEND_ORIGIN` on the API to the frontend's URL, and redeploy the frontend (Vite bakes the variable in at build time).

Free-tier limits to know about: the API sleeps after about 15 minutes without traffic, so the first order after a quiet spell can take ~30 seconds, and free Render Postgres databases expire after 30 days. Fine for a trial, not for a live shop.
