# Kapé Alas-Singko

Order-ahead page for a coffee bar on Magsaysay Avenue, Naga City, plus the API that receives and tracks the orders.

```
frontend/   React 19 + TypeScript + Vite customer app   (see frontend/README.md)
backend/    Express + Postgres order API                (see backend/README.md)
render.yaml Render blueprint: API + Postgres + static site
```

## Run both locally

You need Node 20+ and a Postgres database.

```bash
# 1. Backend
cd backend
cp .env.example .env        # set DATABASE_URL and STAFF_TOKEN
npm install
npm run migrate             # creates the orders table
npm run dev                 # http://localhost:3000

# 2. Frontend (second terminal)
cd frontend
cp .env.example .env        # VITE_ORDER_ENDPOINT=http://localhost:3000/orders
npm install
npm run dev                 # http://localhost:5173
```

From the repo root, `npm run dev:backend`, `npm run dev:frontend` and the other scripts in `package.json` do the same thing.

## How they connect

The frontend POSTs each order to `VITE_ORDER_ENDPOINT` and then polls `GET VITE_ORDER_ENDPOINT?number=A5-XXX` every 15 seconds. The backend serves both on `/orders`, so set the variable to `https://<your-api>/orders`.

## Deploying on Render

`render.yaml` describes the API, a Postgres database and the static frontend. After the first deploy, set `VITE_ORDER_ENDPOINT` on the frontend to `https://<api-service>.onrender.com/orders`, set `FRONTEND_ORIGIN` on the API to the frontend's URL, and redeploy the frontend (Vite bakes the variable in at build time).

Free-tier limits to know about: the API sleeps after about 15 minutes without traffic, so the first order after a quiet spell can take ~30 seconds, and free Render Postgres databases expire after 30 days. Fine for a trial, not for a live shop.
