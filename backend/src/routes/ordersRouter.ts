import { createOrderRequestSchema, idempotencyKeySchema } from '@kape/contract';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Database } from '../db/client.js';
import { HttpError, errorBody, parseOrThrow } from '../http.js';
import { cancelOrderAsCustomer } from '../orders/cancelOrder.js';
import { createOrder } from '../orders/createOrder.js';
import { loadOrderByPublicId } from '../orders/loadOrder.js';
import { PUBLIC_ID_PATTERN } from '../orders/orderNumber.js';

export type OrdersRouterOptions = {
  db: Database;
  now: () => Date;
  /** How many orders one address may place per minute. */
  ordersPerMinute: number;
  generateNumber?: (prefix: string) => string;
};

function publicIdFrom(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !PUBLIC_ID_PATTERN.test(value)) throw new HttpError(404, 'NOT_FOUND', 'We could not find that order.');
  return value;
}

/** What a customer does with an order: place it, look at it, cancel it. */
export function createOrdersRouter({ db, now, ordersPerMinute, generateNumber }: OrdersRouterOptions) {
  const router = Router();

  const placeLimit = rateLimit({
    windowMs: 60_000,
    limit: ordersPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorBody('RATE_LIMITED', 'Too many orders from here. Please wait a minute and try again.'));
    },
  });

  router.post('/orders', placeLimit, async (req, res) => {
    const key = parseOrThrow(idempotencyKeySchema, req.header('idempotency-key'), 'Idempotency-Key');
    const input = parseOrThrow(createOrderRequestSchema, req.body);
    const { order, created } = await createOrder({ db, now, generateNumber }, input, key);
    res.status(created ? 201 : 200).set('Cache-Control', 'no-store').json(order);
  });

  router.get('/orders/:publicId', async (req, res) => {
    const order = await loadOrderByPublicId(db, publicIdFrom(req.params.publicId));
    if (!order) throw new HttpError(404, 'NOT_FOUND', 'We could not find that order.');
    res.set('Cache-Control', 'no-store').json(order);
  });

  router.post('/orders/:publicId/cancel', async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await cancelOrderAsCustomer(db, publicIdFrom(req.params.publicId)));
  });

  return router;
}
