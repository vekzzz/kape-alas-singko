# Backend

Express + Postgres API for Kapé Alas-Singko orders. It keeps the contract the frontend already uses: orders POSTed as JSON (even with `Content-Type: text/plain`) and status polled with `GET /orders?number=...`.

## Setup

```bash
cp .env.example .env
npm install
npm run migrate   # applies db/schema.sql
npm run dev       # http://localhost:3000
npm test
```

## Endpoints

| Method | Path | Who | What |
| --- | --- | --- | --- |
| POST | `/orders` | customer | Store an order. Replies `201 { "number": "A5-K7P" }`. If the number is already taken the server picks a new one and returns it. |
| GET | `/orders?number=A5-K7P` | customer | Replies `{ "status": "received" }` (or `preparing`, `ready`, `collected`). `404` if unknown. |
| GET | `/orders` | staff | Open orders, soonest pickup first. `?status=ready`, `?status=all` to filter. |
| PATCH | `/orders/:number/status` | staff | Body `{ "status": "ready" }`. |
| GET | `/health` | anyone | Liveness check. |

Staff routes need `Authorization: Bearer <STAFF_TOKEN>`:

```bash
curl -H "Authorization: Bearer $STAFF_TOKEN" https://your-api/orders
curl -X PATCH -H "Authorization: Bearer $STAFF_TOKEN" -d '{"status":"ready"}' https://your-api/orders/A5-K7P/status
```

There is no staff screen yet; until one exists, staff move orders along with these calls or directly in the database.

## Known gaps

- Customer status lookups are protected only by the order number (3 random characters after `A5-`), the same as before. Fine for a coffee order, not for anything private.
- No rate limiting on `POST /orders`.
