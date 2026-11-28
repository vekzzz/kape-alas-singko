import { menuResponseSchema, pickupSlotsResponseSchema, shopResponseSchema } from '@kape/contract';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { instantAt } from '../src/domain/zonedTime.js';
import { menuItems, shopClosures, shopSettings } from '../src/db/schema.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { connectTestDatabase, emptyAllTables } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

// Saturday 2026-11-28, 09:00 in Manila.
let clock = instantAt('2026-11-28', 9 * 60, 'Asia/Manila');
const app = createApp({ db, frontendOrigins: [], logLevel: 'silent', now: () => clock });

beforeEach(async () => {
  await emptyAllTables(pool);
  await seedDatabase(db);
  clock = instantAt('2026-11-28', 9 * 60, 'Asia/Manila');
});
afterAll(() => pool.end());

describe('GET /api/v1/menu', () => {
  it('matches the contract', async () => {
    const res = await request(app).get('/api/v1/menu');
    expect(res.status).toBe(200);
    const menu = menuResponseSchema.parse(res.body);
    expect(menu.groups.map((g) => g.id)).toEqual(['espresso', 'slow', 'cold', 'bakery']);
    expect(menu.items).toHaveLength(18);
  });

  it('lists items in menu order within their group', async () => {
    const { items } = menuResponseSchema.parse((await request(app).get('/api/v1/menu')).body);
    expect(items.filter((i) => i.groupId === 'espresso').map((i) => i.id)).toEqual([
      'alas-singko',
      'americano',
      'flat-white',
      'latte',
      'spanish-latte',
      'tablea-mocha',
    ]);
  });

  it('carries option prices and each item\'s defaults', async () => {
    const menu = menuResponseSchema.parse((await request(app).get('/api/v1/menu')).body);
    const value = (group: string, code: string) => menu.optionGroups.find((g) => g.id === group)?.values.find((v) => v.code === code);
    expect(value('size', 'large')?.priceDeltaCentavos).toBe(3000);

    const coldBrew = menu.items.find((i) => i.id === 'cold-brew')!;
    expect(coldBrew.options.map((o) => o.optionGroupId)).toEqual(['size', 'milk']);
    expect(coldBrew.options.find((o) => o.optionGroupId === 'milk')?.defaultValueId).toBe(value('milk', 'none')?.id);
    expect(menu.items.find((i) => i.id === 'pandesal')?.options).toEqual([]);
  });

  it('hides inactive items and shows sold-out ones', async () => {
    await db.update(menuItems).set({ isActive: false }).where(eq(menuItems.id, 'latte'));
    const { items } = menuResponseSchema.parse((await request(app).get('/api/v1/menu')).body);
    expect(items.some((i) => i.id === 'latte')).toBe(false);
    expect(items.find((i) => i.id === 'ube-pandesal')?.isSoldOut).toBe(true);
  });

  it('answers 304 when nothing changed, and a new body when it did', async () => {
    const first = await request(app).get('/api/v1/menu');
    const etag = first.headers.etag;
    expect(etag).toBeTruthy();

    const same = await request(app).get('/api/v1/menu').set('If-None-Match', etag!);
    expect(same.status).toBe(304);

    await db.update(menuItems).set({ isSoldOut: true }).where(eq(menuItems.id, 'latte'));
    const changed = await request(app).get('/api/v1/menu').set('If-None-Match', etag!);
    expect(changed.status).toBe(200);
  });
});

describe('GET /api/v1/shop', () => {
  it('matches the contract', async () => {
    const res = await request(app).get('/api/v1/shop');
    expect(res.status).toBe(200);
    const shop = shopResponseSchema.parse(res.body);
    expect(shop).toMatchObject({ name: 'Kapé Alas-Singko', timezone: 'Asia/Manila', acceptingOrders: true, slotMinutes: 15, minLeadMinutes: 10 });
    expect(shop.openingHours).toHaveLength(7);
    expect(shop.openingHours[0]).toEqual({ weekday: 0, opensAt: '05:00', closesAt: '21:00', isClosed: false });
  });

  it('lists upcoming closures only', async () => {
    await db.insert(shopClosures).values([
      { closedOn: '2026-11-27', reason: 'Yesterday' },
      { closedOn: '2026-11-28', reason: 'Today' },
      { closedOn: '2026-12-25', reason: 'Christmas Day' },
    ]);
    const { closures } = shopResponseSchema.parse((await request(app).get('/api/v1/shop')).body);
    expect(closures).toEqual([
      { date: '2026-11-28', reason: 'Today' },
      { date: '2026-12-25', reason: 'Christmas Day' },
    ]);
  });
});

describe('GET /api/v1/pickup-slots', () => {
  it('offers the rest of today from the next quarter hour', async () => {
    const res = await request(app).get('/api/v1/pickup-slots');
    expect(res.status).toBe(200);
    const body = pickupSlotsResponseSchema.parse(res.body);
    expect(body.date).toBe('2026-11-28');
    expect(body.slots[0]?.pickupAt).toBe(instantAt('2026-11-28', 9 * 60 + 15, 'Asia/Manila').toISOString());
    expect(body.slots.at(-1)?.pickupAt).toBe(instantAt('2026-11-28', 20 * 60 + 45, 'Asia/Manila').toISOString());
  });

  it('switches to the next open day after the last slot', async () => {
    clock = instantAt('2026-11-28', 20 * 60 + 40, 'Asia/Manila');
    await db.insert(shopClosures).values({ closedOn: '2026-11-29', reason: 'Holiday' });

    const body = pickupSlotsResponseSchema.parse((await request(app).get('/api/v1/pickup-slots')).body);
    expect(body.date).toBe('2026-11-30');
    expect(body.slots[0]?.pickupAt).toBe(instantAt('2026-11-30', 5 * 60, 'Asia/Manila').toISOString());
  });

  it('offers nothing while orders are paused', async () => {
    await db.update(shopSettings).set({ acceptingOrders: false });
    const body = pickupSlotsResponseSchema.parse((await request(app).get('/api/v1/pickup-slots')).body);
    expect(body).toEqual({ date: null, slots: [] });
  });

  it('is never cached', async () => {
    const res = await request(app).get('/api/v1/pickup-slots');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
