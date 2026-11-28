import { orderResponseSchema, staffOrderSchema, staffOrdersResponseSchema, type CreateOrderRequest, type StaffOrder } from '@kape/contract';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { menuItems, orderStatusEvents, orders, shopSettings, staff } from '../src/db/schema.js';
import { instantAt } from '../src/domain/zonedTime.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { createStaff } from '../src/staff/createStaff.js';
import { connectTestDatabase, emptyAllTables } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

// Saturday 2026-11-28, 09:00 in Manila.
const clock = instantAt('2026-11-28', 9 * 60, 'Asia/Manila');
const slot = (hours: number, minutes: number, date = '2026-11-28') => instantAt(date, hours * 60 + minutes, 'Asia/Manila').toISOString();
const app = createApp({ db, frontendOrigins: [], logLevel: 'silent', now: () => clock, ordersPerMinute: 1000, loginAttempts: 1000 });

let token = '';
let anaId = 0;
const as = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
const get = (path: string) => as(request(app).get(`/api/v1/staff${path}`));
const post = (path: string, body: object) => as(request(app).post(`/api/v1/staff${path}`).send(body));
const patch = (path: string, body: object) => as(request(app).patch(`/api/v1/staff${path}`).send(body));

let keyCounter = 0;
async function placeOrder(overrides: Partial<CreateOrderRequest> = {}) {
  const body: CreateOrderRequest = {
    orderType: 'take-out',
    name: 'Maria',
    phone: '09171234567',
    pickupAt: slot(9, 15),
    lines: [{ itemId: 'latte', quantity: 1 }],
    expectedTotalCentavos: 17000,
    ...overrides,
  };
  const res = await request(app).post('/api/v1/orders').set('Idempotency-Key', `board-key-${String(++keyCounter).padStart(6, '0')}`).send(body);
  expect(res.status).toBe(201);
  return orderResponseSchema.parse(res.body);
}

const status = (publicId: string, from: string, to: string, reason?: string) => post(`/orders/${publicId}/status`, { from, to, ...(reason ? { reason } : {}) });
const customerView = async (publicId: string) => orderResponseSchema.parse((await request(app).get(`/api/v1/orders/${publicId}`)).body);

beforeEach(async () => {
  await emptyAllTables(pool);
  await seedDatabase(db);
  const ana = await createStaff(db, { name: 'Ana', email: 'ana@example.com', password: 'correct horse battery' });
  anaId = ana.id;
  token = (await request(app).post('/api/v1/staff/login').send({ email: 'ana@example.com', password: 'correct horse battery' })).body.token;
});
afterAll(() => pool.end());

describe('GET /api/v1/staff/orders', () => {
  it('lists the day\'s orders, soonest pickup first, with what only staff see', async () => {
    const later = await placeOrder({ pickupAt: slot(10, 0), name: 'Later' });
    const sooner = await placeOrder({ pickupAt: slot(9, 15), name: 'Sooner' });

    const res = await get('/orders');
    expect(res.status).toBe(200);
    const board = staffOrdersResponseSchema.parse(res.body);

    expect(board.date).toBe('2026-11-28');
    expect(board.orders.map((o) => o.publicId)).toEqual([sooner.publicId, later.publicId]);
    expect(board.orders[0]).toMatchObject({ name: 'Sooner', phone: '09171234567', businessDate: '2026-11-28', paymentMethod: null, paidAt: null, status: 'received' });
    expect(board.orders[0]?.lines[0]).toMatchObject({ itemName: 'Latte', quantity: 1 });
  });

  it('keeps the phone number out of what the customer sees', async () => {
    const order = await placeOrder();
    const res = await request(app).get(`/api/v1/orders/${order.publicId}`);
    expect(res.body).not.toHaveProperty('phone');
    expect(res.body).not.toHaveProperty('paymentMethod');
  });

  it('shows one business day at a time', async () => {
    await placeOrder();
    await db.insert(orders).values({
      publicId: 'tomorrows-order-0000',
      number: 'A5-TMW',
      businessDate: '2026-11-29',
      idempotencyKey: 'tomorrow-key-0001',
      orderType: 'dine-in',
      customerName: 'Tomorrow',
      pickupAt: new Date(slot(7, 0, '2026-11-29')),
      totalCentavos: 1000,
    });

    expect(staffOrdersResponseSchema.parse((await get('/orders')).body).orders).toHaveLength(1);
    const tomorrow = staffOrdersResponseSchema.parse((await get('/orders?date=2026-11-29')).body);
    expect(tomorrow.orders.map((o) => o.name)).toEqual(['Tomorrow']);
    expect(tomorrow.date).toBe('2026-11-29');
  });

  it('only sends what changed since the last look', async () => {
    const a = await placeOrder({ name: 'A' });
    const b = await placeOrder({ name: 'B' });
    await db.update(orders).set({ updatedAt: new Date(clock.getTime() - 60_000) }).where(eq(orders.publicId, a.publicId));
    await db.update(orders).set({ updatedAt: new Date(clock.getTime() + 10_000) }).where(eq(orders.publicId, b.publicId));

    const first = staffOrdersResponseSchema.parse((await get('/orders')).body);
    expect(first.orders).toHaveLength(2);

    const changed = staffOrdersResponseSchema.parse((await get(`/orders?since=${encodeURIComponent(clock.toISOString())}`)).body);
    expect(changed.orders.map((o) => o.name)).toEqual(['B']);
  });

  it('hands back a cursor that runs a few seconds behind, so nothing is missed', async () => {
    const board = staffOrdersResponseSchema.parse((await get('/orders')).body);
    expect(board.cursor).toBe(new Date(clock.getTime() - 5_000).toISOString());
  });

  it('rejects a malformed date or cursor', async () => {
    const date = await get('/orders?date=yesterday');
    expect(date.status).toBe(400);
    expect(date.body.error.fields).toHaveProperty('date');
    expect((await get('/orders?since=soon')).body.error.fields).toHaveProperty('since');
  });
});

describe('POST /api/v1/staff/orders/:publicId/status', () => {
  it('moves an order through every step and the customer sees each one', async () => {
    const { publicId } = await placeOrder();

    for (const [from, to] of [['received', 'preparing'], ['preparing', 'ready'], ['ready', 'collected']] as const) {
      const res = await status(publicId, from, to);
      expect(res.status).toBe(200);
      expect(staffOrderSchema.parse(res.body).status).toBe(to);
      expect((await customerView(publicId)).status).toBe(to);
    }

    const events = (await customerView(publicId)).events.map((event) => event.status);
    expect(events).toEqual(['received', 'preparing', 'ready', 'collected']);
  });

  it('records who made each change', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'preparing');

    const events = await db.select().from(orderStatusEvents).orderBy(orderStatusEvents.id);
    expect(events).toMatchObject([
      { status: 'received', actor: 'customer', staffId: null },
      { status: 'preparing', actor: 'staff', staffId: anaId },
    ]);
  });

  it('lets staff undo a step after a mis-tap', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'preparing');
    await status(publicId, 'preparing', 'ready');

    expect(staffOrderSchema.parse((await status(publicId, 'ready', 'preparing')).body).status).toBe('preparing');
    await status(publicId, 'preparing', 'ready');
    await status(publicId, 'ready', 'collected');
    expect(staffOrderSchema.parse((await status(publicId, 'collected', 'ready')).body).status).toBe('ready');
  });

  it('cancels with a reason, and the customer is told why', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'preparing');

    const res = await status(publicId, 'preparing', 'cancelled', 'sold_out');
    expect(res.status).toBe(200);
    expect(staffOrderSchema.parse(res.body)).toMatchObject({ status: 'cancelled', cancelReason: 'sold_out' });
    expect(await customerView(publicId)).toMatchObject({ status: 'cancelled', cancelReason: 'sold_out' });
  });

  it('asks for a reason when cancelling', async () => {
    const { publicId } = await placeOrder();
    const res = await status(publicId, 'received', 'cancelled');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('reason');
    expect((await customerView(publicId)).status).toBe('received');
  });

  it('refuses moves that are not one step, and anything after cancelling or collecting', async () => {
    const { publicId } = await placeOrder();

    for (const [from, to] of [['received', 'ready'], ['received', 'collected'], ['received', 'received']]) {
      const res = await status(publicId, from!, to!);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    }

    await status(publicId, 'received', 'cancelled', 'no_show');
    expect((await status(publicId, 'cancelled', 'received')).body.error.code).toBe('INVALID_TRANSITION');

    const other = await placeOrder();
    await status(other.publicId, 'received', 'preparing');
    await status(other.publicId, 'preparing', 'ready');
    await status(other.publicId, 'ready', 'collected');
    expect((await status(other.publicId, 'collected', 'cancelled', 'other')).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('answers 409 with where the order really is when the board is out of date', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'preparing'); // another barista got there first

    const res = await status(publicId, 'received', 'preparing');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STATUS_CONFLICT');
    expect(staffOrderSchema.parse(res.body.error.details.order).status).toBe('preparing');
    expect(await db.select().from(orderStatusEvents).where(eq(orderStatusEvents.status, 'preparing'))).toHaveLength(1);
  });

  it('lets only one of two simultaneous taps through', async () => {
    const { publicId } = await placeOrder();
    const [a, b] = await Promise.all([status(publicId, 'received', 'preparing'), status(publicId, 'received', 'preparing')]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await db.select().from(orderStatusEvents).where(eq(orderStatusEvents.status, 'preparing'))).toHaveLength(1);
  });

  it('wins over a customer cancelling at the same moment, one way or the other, never both', async () => {
    const { publicId } = await placeOrder();
    const [bar, customer] = await Promise.all([status(publicId, 'received', 'preparing'), request(app).post(`/api/v1/orders/${publicId}/cancel`)]);

    expect([bar.status, customer.status].filter((s) => s === 200)).toHaveLength(1);
    const final = (await customerView(publicId)).status;
    expect(['preparing', 'cancelled']).toContain(final);
  });

  it('answers 404 for an unknown or malformed order', async () => {
    expect((await status('AAAAAAAAAAAAAAAAAAAAAA', 'received', 'preparing')).status).toBe(404);
    expect((await status('x', 'received', 'preparing')).status).toBe(404);
  });
});

describe('POST /api/v1/staff/orders/:publicId/payment', () => {
  it('records how it was paid, and the customer sees it is paid', async () => {
    const { publicId } = await placeOrder();
    const res = await post(`/orders/${publicId}/payment`, { method: 'cash' });

    expect(res.status).toBe(200);
    const order = staffOrderSchema.parse(res.body);
    expect(order).toMatchObject({ paymentMethod: 'cash', paid: true });
    expect(order.paidAt).not.toBeNull();
    expect((await customerView(publicId)).paid).toBe(true);
  });

  it('does not hold up the order: it can be paid before, during or after the steps', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'preparing');
    await status(publicId, 'preparing', 'ready');
    await status(publicId, 'ready', 'collected');
    expect((await post(`/orders/${publicId}/payment`, { method: 'gcash' })).status).toBe(200);
  });

  it('corrects the method but keeps the time of the first payment', async () => {
    const { publicId } = await placeOrder();
    const first = staffOrderSchema.parse((await post(`/orders/${publicId}/payment`, { method: 'cash' })).body);
    const second = staffOrderSchema.parse((await post(`/orders/${publicId}/payment`, { method: 'gcash' })).body);

    expect(second.paymentMethod).toBe('gcash');
    expect(second.paidAt).toBe(first.paidAt);
  });

  it('refuses to take payment for a cancelled order', async () => {
    const { publicId } = await placeOrder();
    await status(publicId, 'received', 'cancelled', 'customer_request');
    const res = await post(`/orders/${publicId}/payment`, { method: 'cash' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('knows only cash and gcash, and unknown orders', async () => {
    const { publicId } = await placeOrder();
    expect((await post(`/orders/${publicId}/payment`, { method: 'card' })).status).toBe(400);
    expect((await post('/orders/AAAAAAAAAAAAAAAAAAAAAA/payment', { method: 'cash' })).status).toBe(404);
  });

  it('shows up in the board\'s next poll', async () => {
    const { publicId } = await placeOrder();
    const cursor = staffOrdersResponseSchema.parse((await get('/orders')).body).cursor;
    await db.update(orders).set({ updatedAt: new Date(clock.getTime() - 3_600_000) }).where(eq(orders.publicId, publicId));

    await post(`/orders/${publicId}/payment`, { method: 'cash' });

    const changed = staffOrdersResponseSchema.parse((await get(`/orders?since=${encodeURIComponent(cursor)}`)).body);
    expect(changed.orders.map((o: StaffOrder) => o.publicId)).toEqual([publicId]);
  });
});

describe('PATCH /api/v1/staff/menu-items/:id', () => {
  it('marks an item sold out: customers see it and cannot order it', async () => {
    const res = await patch('/menu-items/latte', { isSoldOut: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'latte', isSoldOut: true });

    const menu = (await request(app).get('/api/v1/menu')).body;
    expect(menu.items.find((item: { id: string }) => item.id === 'latte').isSoldOut).toBe(true);

    const order = await request(app)
      .post('/api/v1/orders')
      .set('Idempotency-Key', 'sold-out-key-0001')
      .send({ orderType: 'take-out', name: 'Maria', phone: null, pickupAt: slot(9, 15), lines: [{ itemId: 'latte', quantity: 1 }], expectedTotalCentavos: 17000 });
    expect(order.status).toBe(409);
    expect(order.body.error).toMatchObject({ code: 'ITEM_UNAVAILABLE', details: { items: ['Latte'] } });
  });

  it('brings an item back', async () => {
    await patch('/menu-items/ube-pandesal', { isSoldOut: false });
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, 'ube-pandesal'));
    expect(item?.isSoldOut).toBe(false);
  });

  it('answers 404 for an unknown item and 400 for a bad body', async () => {
    expect((await patch('/menu-items/no-such-item', { isSoldOut: true })).status).toBe(404);
    expect((await patch('/menu-items/latte', { isSoldOut: 'yes' })).status).toBe(400);
  });
});

describe('PATCH /api/v1/staff/shop', () => {
  it('pauses online orders: no pickup times, and checkout says so', async () => {
    const res = await patch('/shop', { acceptingOrders: false });
    expect(res.body).toEqual({ acceptingOrders: false });

    expect((await request(app).get('/api/v1/pickup-slots')).body).toEqual({ date: null, slots: [] });
    expect((await request(app).get('/api/v1/shop')).body.acceptingOrders).toBe(false);

    const order = await request(app)
      .post('/api/v1/orders')
      .set('Idempotency-Key', 'paused-key-000001')
      .send({ orderType: 'take-out', name: 'Maria', phone: null, pickupAt: slot(9, 15), lines: [{ itemId: 'latte', quantity: 1 }], expectedTotalCentavos: 17000 });
    expect(order.body.error.code).toBe('ORDERS_PAUSED');
  });

  it('resumes them', async () => {
    await patch('/shop', { acceptingOrders: false });
    await patch('/shop', { acceptingOrders: true });
    const [settings] = await db.select().from(shopSettings);
    expect(settings?.acceptingOrders).toBe(true);
    expect((await request(app).get('/api/v1/pickup-slots')).body.slots.length).toBeGreaterThan(0);
  });

  it('does not touch the staff table', async () => {
    await patch('/shop', { acceptingOrders: false });
    expect(await db.select().from(staff)).toHaveLength(1);
  });
});
