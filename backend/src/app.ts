import { timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { isOrderNumber, isOrderStatus, parseOrder } from './validate.js';

const ORDER_ALPHABET = 'ACDEFGHJKMNPRTVWXY34679';
const UNIQUE_VIOLATION = '23505';

function newOrderNumber(): string {
  let code = '';
  for (let i = 0; i < 3; i++) code += ORDER_ALPHABET[Math.floor(Math.random() * ORDER_ALPHABET.length)];
  return `A5-${code}`;
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Options = { pool: Pick<Pool, 'query'>; staffToken?: string; frontendOrigin?: string };

export function createApp({ pool, staffToken, frontendOrigin }: Options) {
  const app = express();

  app.use(cors({ origin: frontendOrigin && frontendOrigin !== '*' ? frontendOrigin.split(',') : true, methods: ['GET', 'POST', 'PATCH'] }));
  // The frontend sends orders as text/plain (no CORS preflight), so read every body as text and parse it ourselves.
  app.use(express.text({ type: () => true, limit: '100kb' }));

  function requireStaff(req: Request, res: Response, next: NextFunction) {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!staffToken || !sameSecret(token, staffToken)) {
      res.status(401).json({ error: 'Staff token required' });
      return;
    }
    next();
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Place an order. Replies { number } so the frontend shows the number the server stored.
  app.post('/orders', async (req, res) => {
    let body: unknown;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : null;
    } catch {
      res.status(400).json({ error: 'Body must be valid JSON' });
      return;
    }
    const parsed = parseOrder(body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const o = parsed.order;

    // The browser makes the number; on the rare clash the server picks another and tells the customer.
    let number = o.number;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pool.query(
          `INSERT INTO orders (number, order_type, name, phone, pickup_at, placed_at, total, items)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [number, o.orderType, o.name, o.phone, o.pickupAt, o.placedAt, o.total, JSON.stringify(o.items)],
        );
        res.status(201).json({ number });
        return;
      } catch (error) {
        if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
        number = newOrderNumber();
      }
    }
    res.status(503).json({ error: 'Could not allocate an order number, try again' });
  });

  // Customers poll this: GET /orders?number=A5-K7P -> { status }
  app.get('/orders', async (req, res, next) => {
    const number = req.query.number;
    if (number === undefined) {
      next();
      return;
    }
    if (!isOrderNumber(number)) {
      res.status(400).json({ error: 'number must look like A5-XXX' });
      return;
    }
    const { rows } = await pool.query('SELECT status FROM orders WHERE number = $1', [number]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ status: rows[0].status });
  });

  // Staff: open orders, soonest pickup first. ?status=ready narrows it, ?status=all includes collected.
  app.get('/orders', requireStaff, async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    if (status !== 'open' && status !== 'all' && !isOrderStatus(status)) {
      res.status(400).json({ error: 'status must be open, all, received, preparing, ready or collected' });
      return;
    }
    const filter = status === 'open' ? `WHERE status <> 'collected'` : status === 'all' ? '' : 'WHERE status = $1';
    const { rows } = await pool.query(
      `SELECT number, order_type AS "orderType", name, phone, pickup_at AS "pickupAt", placed_at AS "placedAt",
              total::float AS total, items, status
       FROM orders ${filter} ORDER BY pickup_at ASC LIMIT 200`,
      filter.includes('$1') ? [status] : [],
    );
    res.json({ orders: rows });
  });

  // Staff: move an order along. Body: { "status": "ready" }
  app.patch('/orders/:number/status', requireStaff, async (req, res) => {
    const { number } = req.params;
    let body: unknown;
    try {
      body = JSON.parse(typeof req.body === 'string' ? req.body : '');
    } catch {
      res.status(400).json({ error: 'Body must be valid JSON' });
      return;
    }
    const status = body && typeof body === 'object' ? (body as { status?: unknown }).status : undefined;
    if (!isOrderNumber(number) || !isOrderStatus(status)) {
      res.status(400).json({ error: 'Valid order number and status (received, preparing, ready, collected) required' });
      return;
    }
    const { rows } = await pool.query('UPDATE orders SET status = $2, updated_at = now() WHERE number = $1 RETURNING number, status', [number, status]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(rows[0]);
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
