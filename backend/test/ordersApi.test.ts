import { orderResponseSchema, type CreateOrderRequest } from '@kape/contract';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppOptions } from '../src/app.js';
import { menuItems, orderItemOptions, orderItems, orderStatusEvents, orders, shopSettings } from '../src/db/schema.js';
import { instantAt } from '../src/domain/zonedTime.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { connectTestDatabase, emptyAllTables } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

// Saturday 2026-11-28, 09:00 in Manila. The soonest slot is 09:15.
const clock = instantAt('2026-11-28', 9 * 60, 'Asia/Manila');
const slot = (hours: number, minutes: number) => instantAt('2026-11-28', hours * 60 + minutes, 'Asia/Manila').toISOString();

function makeApp(options: Partial<AppOptions> = {}) {
  return createApp({ db, frontendOrigins: ['http://localhost:5173'], logLevel: 'silent', now: () => clock, ordersPerMinute: 1000, ...options });
}
const app = makeApp();

let keyCounter = 0;
const newKey = () => `test-key-${String(++keyCounter).padStart(6, '0')}`;

/** A large oat-milk latte with an extra shot, twice: 2 x (170 + 30 + 40 + 50) = 580 pesos. */
function orderBody(overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest {
  return {
    orderType: 'take-out',
    name: 'Maria',
    phone: null,
    pickupAt: slot(9, 15),
    lines: [{ itemId: 'latte', options: { size: 'large', milk: 'oat', extra_shot: 'extra' }, note: 'less ice', quantity: 2 }],
    expectedTotalCentavos: 58000,
    ...overrides,
  };
}

/** Pass `null` as the key to send no Idempotency-Key header at all. */
const place = (body: unknown = orderBody(), key: string | null = newKey(), target = app) => {
  const req = request(target).post('/api/v1/orders');
  if (key !== null) req.set('Idempotency-Key', key);
  return req.send(body as object);
};

beforeEach(async () => {
  await emptyAllTables(pool);
  await seedDatabase(db);
});
afterAll(() => pool.end());

describe('POST /api/v1/orders', () => {
  it('places an order and replies with the receipt', async () => {
    const res = await place();
    expect(res.status).toBe(201);

    const order = orderResponseSchema.parse(res.body);
    expect(order).toMatchObject({
      status: 'received',
      cancelReason: null,
      orderType: 'take-out',
      name: 'Maria',
      pickupAt: slot(9, 15),
      totalCentavos: 58000,
      paid: false,
    });
    expect(order.number).toMatch(/^A5-[ACDEFGHJKMNPRTVWXY34679]{3}$/);
    expect(order.publicId.length).toBeGreaterThanOrEqual(16);
    expect(order.lines).toEqual([
      { itemName: 'Latte', optionLabels: ['Large', 'Hot', 'Oat milk', 'Extra shot'], note: 'less ice', quantity: 2, unitPriceCentavos: 29000, lineTotalCentavos: 58000 },
    ]);
    expect(order.events.map((event) => event.status)).toEqual(['received']);
  });

  it('saves the order, its lines, their options and the first event', async () => {
    const order = orderResponseSchema.parse((await place()).body);

    const [row] = await db.select().from(orders).where(eq(orders.publicId, order.publicId));
    expect(row).toMatchObject({ businessDate: '2026-11-28', status: 'received', phone: null, totalCentavos: 58000, paidAt: null });

    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, row!.id));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ menuItemId: 'latte', itemName: 'Latte', unitPriceCentavos: 29000, quantity: 2, position: 0 });
    expect(await db.select().from(orderItemOptions).where(eq(orderItemOptions.orderItemId, lines[0]!.id))).toHaveLength(4);

    const events = await db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, row!.id));
    expect(events).toMatchObject([{ status: 'received', actor: 'customer', staffId: null }]);
  });

  it('uses the item defaults for choices the customer leaves out', async () => {
    const latte = orderResponseSchema.parse((await place(orderBody({ lines: [{ itemId: 'latte', quantity: 1 }], expectedTotalCentavos: 17000 }))).body);
    expect(latte.lines[0]?.optionLabels).toEqual(['Regular', 'Hot', 'Whole milk']);

    const coldBrew = orderResponseSchema.parse((await place(orderBody({ lines: [{ itemId: 'cold-brew', quantity: 1 }], expectedTotalCentavos: 16000 }))).body);
    expect(coldBrew.lines[0]?.optionLabels).toEqual(['Regular', 'No milk']);

    const pandesal = orderResponseSchema.parse((await place(orderBody({ lines: [{ itemId: 'pandesal', quantity: 3 }], expectedTotalCentavos: 27000 }))).body);
    expect(pandesal.lines[0]).toMatchObject({ optionLabels: [], quantity: 3, lineTotalCentavos: 27000 });
  });

  it('adds up several lines', async () => {
    const body = orderBody({
      lines: [
        { itemId: 'latte', quantity: 1 },
        { itemId: 'pandesal', quantity: 2, note: 'warmed up' },
      ],
      expectedTotalCentavos: 17000 + 18000,
    });
    const order = orderResponseSchema.parse((await place(body)).body);
    expect(order.totalCentavos).toBe(35000);
    expect(order.lines.map((line) => line.itemName)).toEqual(['Latte', 'Pan de sal']);
  });

  it('keeps a phone number when given', async () => {
    const order = orderResponseSchema.parse((await place(orderBody({ phone: '09171234567' }))).body);
    const [row] = await db.select().from(orders).where(eq(orders.publicId, order.publicId));
    expect(row?.phone).toBe('09171234567');
  });

  describe('refusals', () => {
    it('refuses when the total the customer saw is out of date', async () => {
      const res = await place(orderBody({ expectedTotalCentavos: 50000 }));
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'PRICE_CHANGED', details: { totalCentavos: 58000 } });
      expect(await db.select().from(orders)).toHaveLength(0);
    });

    it('prices from the menu, so a price change in the database is caught', async () => {
      await db.update(menuItems).set({ basePriceCentavos: 18000 }).where(eq(menuItems.id, 'latte'));
      const res = await place();
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'PRICE_CHANGED', details: { totalCentavos: 60000 } });
    });

    it('refuses an item that is sold out, gone, or asked for with a choice it does not have', async () => {
      const soldOut = await place(orderBody({ lines: [{ itemId: 'ube-pandesal', quantity: 1 }], expectedTotalCentavos: 11000 }));
      expect(soldOut.status).toBe(409);
      expect(soldOut.body.error).toMatchObject({ code: 'ITEM_UNAVAILABLE', details: { items: ['Ube cheese pandesal'] } });

      const gone = await place(orderBody({ lines: [{ itemId: 'no-such-drink', quantity: 1 }], expectedTotalCentavos: 0 }));
      expect(gone.body.error).toMatchObject({ code: 'ITEM_UNAVAILABLE', details: { items: ['no-such-drink'] } });

      const badValue = await place(orderBody({ lines: [{ itemId: 'latte', options: { milk: 'soy' }, quantity: 1 }], expectedTotalCentavos: 17000 }));
      expect(badValue.body.error).toMatchObject({ code: 'ITEM_UNAVAILABLE', details: { items: ['Latte'] } });

      const notOffered = await place(orderBody({ lines: [{ itemId: 'pandesal', options: { size: 'large' }, quantity: 1 }], expectedTotalCentavos: 9000 }));
      expect(notOffered.body.error).toMatchObject({ code: 'ITEM_UNAVAILABLE', details: { items: ['Pan de sal'] } });
    });

    it('lists every unavailable item, not just the first', async () => {
      const body = orderBody({
        lines: [
          { itemId: 'ube-pandesal', quantity: 1 },
          { itemId: 'latte', quantity: 1 },
          { itemId: 'coconut-cold-brew', quantity: 1 },
        ],
        expectedTotalCentavos: 0,
      });
      const res = await place(body);
      expect(res.body.error.details.items).toEqual(['Ube cheese pandesal', 'Coconut cold brew']);
    });

    it('refuses a pickup time that is too soon, off the grid, or on another day', async () => {
      for (const pickupAt of [slot(9, 0), slot(9, 20), instantAt('2026-11-29', 9 * 60 + 15, 'Asia/Manila').toISOString()]) {
        const res = await place(orderBody({ pickupAt }));
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
      }
    });

    it('refuses while orders are paused', async () => {
      await db.update(shopSettings).set({ acceptingOrders: false });
      const res = await place();
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDERS_PAUSED');
    });
  });

  describe('retries', () => {
    it('returns the first order when the same key is sent again', async () => {
      const key = newKey();
      const first = await place(orderBody(), key);
      const again = await place(orderBody(), key);

      expect(first.status).toBe(201);
      expect(again.status).toBe(200);
      expect(again.body.publicId).toBe(first.body.publicId);
      expect(await db.select().from(orders)).toHaveLength(1);
    });

    it('still returns the first order after the slot has passed or orders were paused', async () => {
      const key = newKey();
      const first = await place(orderBody(), key);
      await db.update(shopSettings).set({ acceptingOrders: false });

      const again = await place(orderBody(), key);
      expect(again.status).toBe(200);
      expect(again.body.publicId).toBe(first.body.publicId);
    });

    it('makes one order when two requests with the same key arrive together', async () => {
      const key = newKey();
      const [a, b] = await Promise.all([place(orderBody(), key), place(orderBody(), key)]);

      expect([a.status, b.status].sort()).toEqual([200, 201]);
      expect(a.body.publicId).toBe(b.body.publicId);
      expect(await db.select().from(orders)).toHaveLength(1);
    });

    it('makes separate orders for separate keys', async () => {
      const [a, b] = [await place(), await place()];
      expect(a.body.publicId).not.toBe(b.body.publicId);
      expect(a.body.number).not.toBe(b.body.number);
    });
  });

  it('draws another number when today already has that one', async () => {
    const numbers = ['A5-AAA', 'A5-AAA', 'A5-CCC'];
    const clashing = makeApp({ generateNumber: () => numbers.shift() ?? 'A5-XXX' });

    const first = await place(orderBody(), newKey(), clashing);
    const second = await place(orderBody(), newKey(), clashing);

    expect(first.body.number).toBe('A5-AAA');
    expect(second.status).toBe(201);
    expect(second.body.number).toBe('A5-CCC');
    expect(await db.select().from(orders)).toHaveLength(2);
  });

  describe('bad requests', () => {
    it('needs an Idempotency-Key', async () => {
      const res = await place(orderBody(), null);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
      expect(res.body.error.fields).toHaveProperty('Idempotency-Key');
    });

    it('names each field that is wrong', async () => {
      const res = await place(orderBody({ name: ' ', phone: '12345', lines: [{ itemId: 'latte', quantity: 0 }] }));
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(['lines.0.quantity', 'name', 'phone']);
    });

    it('limits the name to 30 characters and needs at least one line', async () => {
      expect((await place(orderBody({ name: 'x'.repeat(31) }))).body.error.fields).toHaveProperty('name');
      expect((await place(orderBody({ lines: [], expectedTotalCentavos: 0 }))).body.error.fields).toHaveProperty('lines');
    });

    it('does not take a phone number in the +63 form (the frontend normalizes it first)', async () => {
      expect((await place(orderBody({ phone: '+639171234567' }))).body.error.fields).toHaveProperty('phone');
    });
  });

  it('allows the Idempotency-Key header from the frontend origin', async () => {
    const res = await request(app)
      .options('/api/v1/orders')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('idempotency-key');
  });

  it('answers 429 after too many orders from one address', async () => {
    const limited = makeApp({ ordersPerMinute: 2 });
    expect((await place(orderBody(), newKey(), limited)).status).toBe(201);
    expect((await place(orderBody(), newKey(), limited)).status).toBe(201);

    const third = await place(orderBody(), newKey(), limited);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/v1/orders/:publicId', () => {
  it('returns the order with its history', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    const res = await request(app).get(`/api/v1/orders/${placed.publicId}`);

    expect(res.status).toBe(200);
    expect(orderResponseSchema.parse(res.body)).toEqual(placed);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('shows the status the bar has moved the order to', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    await db.update(orders).set({ status: 'ready' }).where(eq(orders.publicId, placed.publicId));
    expect((await request(app).get(`/api/v1/orders/${placed.publicId}`)).body.status).toBe('ready');
  });

  it('does not find an order by its short number', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    expect((await request(app).get(`/api/v1/orders/${placed.number}`)).status).toBe(404);
  });

  it('answers 404 for an unknown or malformed id', async () => {
    expect((await request(app).get('/api/v1/orders/AAAAAAAAAAAAAAAAAAAAAA')).status).toBe(404);
    const res = await request(app).get('/api/v1/orders/x');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/v1/orders/:publicId/cancel', () => {
  it('cancels an order the bar has not started', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    const res = await request(app).post(`/api/v1/orders/${placed.publicId}/cancel`);

    expect(res.status).toBe(200);
    const order = orderResponseSchema.parse(res.body);
    expect(order).toMatchObject({ status: 'cancelled', cancelReason: 'customer_request' });
    expect(order.events.map((event) => event.status)).toEqual(['received', 'cancelled']);

    const events = await db.select().from(orderStatusEvents);
    expect(events.find((event) => event.status === 'cancelled')).toMatchObject({ actor: 'customer', staffId: null });
  });

  it('is fine to press Cancel twice', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    await request(app).post(`/api/v1/orders/${placed.publicId}/cancel`);
    const again = await request(app).post(`/api/v1/orders/${placed.publicId}/cancel`);

    expect(again.status).toBe(200);
    expect(again.body.status).toBe('cancelled');
    expect(await db.select().from(orderStatusEvents)).toHaveLength(2);
  });

  it('refuses once the bar has started', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    await db.update(orders).set({ status: 'preparing' }).where(eq(orders.publicId, placed.publicId));

    const res = await request(app).post(`/api/v1/orders/${placed.publicId}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANNOT_CANCEL');
    expect((await db.select().from(orders))[0]?.status).toBe('preparing');
  });

  it('refuses to undo a cancellation the bar made', async () => {
    const placed = orderResponseSchema.parse((await place()).body);
    await db.update(orders).set({ status: 'cancelled', cancelReason: 'sold_out' }).where(eq(orders.publicId, placed.publicId));
    expect((await request(app).post(`/api/v1/orders/${placed.publicId}/cancel`)).status).toBe(409);
  });

  it('answers 404 for an unknown order', async () => {
    expect((await request(app).post('/api/v1/orders/AAAAAAAAAAAAAAAAAAAAAA/cancel')).status).toBe(404);
  });
});
