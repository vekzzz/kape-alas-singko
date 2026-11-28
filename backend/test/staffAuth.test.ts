import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppOptions } from '../src/app.js';
import { hashToken } from '../src/auth/sessions.js';
import { orders, staff, staffSessions } from '../src/db/schema.js';
import { instantAt } from '../src/domain/zonedTime.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { StaffCreateError, createStaff } from '../src/staff/createStaff.js';
import { connectTestDatabase, emptyAllTables } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

const HOUR = 60 * 60 * 1000;
const START = instantAt('2026-11-28', 9 * 60, 'Asia/Manila');
let clock = START;
const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));

function makeApp(options: Partial<AppOptions> = {}) {
  return createApp({ db, frontendOrigins: [], logLevel: 'silent', now: () => clock, loginAttempts: 1000, ...options });
}
const app = makeApp();

const PASSWORD = 'correct horse battery';

const login = (email = 'ana@example.com', password = PASSWORD, target = app) => request(target).post('/api/v1/staff/login').send({ email, password });

beforeEach(async () => {
  await emptyAllTables(pool);
  await seedDatabase(db);
  clock = START;
  await createStaff(db, { name: 'Ana', email: 'ana@example.com', password: PASSWORD, role: 'barista' });
  await createStaff(db, { name: 'Boss', email: 'boss@example.com', password: PASSWORD, role: 'manager' });
});
afterAll(() => pool.end());

describe('POST /api/v1/staff/login', () => {
  it('signs a staff member in and says when the session ends', async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.staff).toMatchObject({ name: 'Ana', role: 'barista' });
    expect(typeof res.body.staff.id).toBe('number');
    expect(res.body.token.length).toBeGreaterThanOrEqual(40);
    expect(res.body.expiresAt).toBe(new Date(START.getTime() + 12 * HOUR).toISOString());
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('stores only a hash of the token and an argon2id hash of the password', async () => {
    const { body } = await login();

    const [session] = await db.select().from(staffSessions);
    expect(session?.tokenHash).toBe(hashToken(body.token));
    expect(session?.tokenHash).not.toContain(body.token);

    const [ana] = await db.select().from(staff).where(eq(staff.email, 'ana@example.com'));
    expect(ana?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(ana?.passwordHash).not.toContain(PASSWORD);
  });

  it('does not care about the case of the email', async () => {
    expect((await login('ANA@Example.COM')).status).toBe(200);
  });

  it('gives the same answer for a wrong password, an unknown email and a switched-off account', async () => {
    await db.update(staff).set({ isActive: false }).where(eq(staff.email, 'boss@example.com'));

    const answers = [await login('ana@example.com', 'wrong password'), await login('nobody@example.com'), await login('boss@example.com')];
    for (const answer of answers) {
      expect(answer.status).toBe(401);
      expect(answer.body).toEqual(answers[0]?.body);
      expect(answer.body.error.code).toBe('UNAUTHENTICATED');
    }
    expect(await db.select().from(staffSessions)).toHaveLength(0);
  });

  it('names the fields of a bad request', async () => {
    const res = await request(app).post('/api/v1/staff/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'password']);
  });

  it('slows down someone guessing passwords', async () => {
    const limited = makeApp({ loginAttempts: 3 });
    for (let i = 0; i < 3; i++) expect((await login('ana@example.com', 'wrong password', limited)).status).toBe(401);

    const fourth = await login('ana@example.com', PASSWORD, limited);
    expect(fourth.status).toBe(429);
    expect(fourth.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('sessions', () => {
  const me = (token?: string) => {
    const req = request(app).get('/api/v1/staff/me');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  it('lets a signed-in member see who they are', async () => {
    const { body } = await login();
    const res = await me(body.token);
    expect(res.status).toBe(200);
    expect(res.body.staff).toEqual(body.staff);
  });

  it('turns away a missing, malformed or unknown token', async () => {
    for (const token of [undefined, 'garbage', 'x'.repeat(43)]) {
      const res = await me(token);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
    expect((await request(app).get('/api/v1/staff/me').set('Authorization', 'Basic abc')).status).toBe(401);
  });

  it('ends at logout', async () => {
    const { body } = await login();
    expect((await request(app).post('/api/v1/staff/logout').set('Authorization', `Bearer ${body.token}`)).status).toBe(200);

    expect((await me(body.token)).status).toBe(401);
    const [session] = await db.select().from(staffSessions);
    expect(session?.revokedAt).not.toBeNull();
  });

  it('ends after 12 hours of silence', async () => {
    const { body } = await login();
    advance(12 * HOUR + 60_000);
    expect((await me(body.token)).status).toBe(401);
  });

  it('is extended while it is in use', async () => {
    const { body } = await login();

    advance(2 * 60_000);
    const res = await me(body.token);
    expect(res.body.expiresAt).toBe(new Date(clock.getTime() + 12 * HOUR).toISOString());

    // Eleven and a half hours later it is still alive, because the last visit pushed it forward.
    advance(11.5 * HOUR);
    expect((await me(body.token)).status).toBe(200);
  });

  it('does not write to the database on every poll', async () => {
    const { body } = await login();
    const [before] = await db.select().from(staffSessions);

    advance(10_000);
    await me(body.token);

    const [after] = await db.select().from(staffSessions);
    expect(after?.lastUsedAt.getTime()).toBe(before?.lastUsedAt.getTime());
  });

  it('stops working when the account is switched off', async () => {
    const { body } = await login();
    await db.update(staff).set({ isActive: false }).where(eq(staff.email, 'ana@example.com'));
    expect((await me(body.token)).status).toBe(401);
  });

  it('is separate for each sign-in', async () => {
    const first = (await login()).body.token;
    const second = (await login()).body.token;
    expect(first).not.toBe(second);

    await request(app).post('/api/v1/staff/logout').set('Authorization', `Bearer ${first}`);
    expect((await me(second)).status).toBe(200);
  });

  it('is needed for every staff route', async () => {
    const calls = [
      request(app).post('/api/v1/staff/logout'),
      request(app).get('/api/v1/staff/orders'),
      request(app).post('/api/v1/staff/orders/AAAAAAAAAAAAAAAAAAAAAA/status').send({ from: 'received', to: 'preparing' }),
      request(app).post('/api/v1/staff/orders/AAAAAAAAAAAAAAAAAAAAAA/payment').send({ method: 'cash' }),
      request(app).patch('/api/v1/staff/menu-items/latte').send({ isSoldOut: true }),
      request(app).patch('/api/v1/staff/shop').send({ acceptingOrders: false }),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
  });
});

describe('clearing old data when someone signs in', () => {
  const DAY = 24 * HOUR;
  let counter = 0;

  async function insertOrder(status: string, phone: string | null, updatedDaysAgo: number) {
    counter += 1;
    await db.insert(orders).values({
      publicId: `housekeeping-order-${counter}`,
      number: `A5-H${counter}`,
      businessDate: '2026-10-01',
      idempotencyKey: `housekeeping-key-${counter}`,
      orderType: 'take-out',
      customerName: 'Ana',
      phone,
      pickupAt: START,
      totalCentavos: 1000,
      status,
      cancelReason: status === 'cancelled' ? 'no_show' : null,
      updatedAt: new Date(clock.getTime() - updatedDaysAgo * DAY),
    });
  }

  it('clears phone numbers 30 days after an order is done, and no sooner', async () => {
    await insertOrder('collected', '09170000001', 31);
    await insertOrder('cancelled', '09170000002', 31);
    await insertOrder('collected', '09170000003', 29);
    await insertOrder('preparing', '09170000004', 45); // still open: keep the number

    await login();

    const phones = Object.fromEntries((await db.select({ id: orders.publicId, phone: orders.phone }).from(orders)).map((o) => [o.id, o.phone]));
    expect(phones['housekeeping-order-1']).toBeNull();
    expect(phones['housekeeping-order-2']).toBeNull();
    expect(phones['housekeeping-order-3']).toBe('09170000003');
    expect(phones['housekeeping-order-4']).toBe('09170000004');
  });

  it('removes sessions that ended more than a week ago', async () => {
    const [ana] = await db.select().from(staff).where(eq(staff.email, 'ana@example.com'));
    await db.insert(staffSessions).values([
      { staffId: ana!.id, tokenHash: 'expired-long-ago', createdAt: clock, lastUsedAt: clock, expiresAt: new Date(clock.getTime() - 8 * DAY) },
      { staffId: ana!.id, tokenHash: 'expired-yesterday', createdAt: clock, lastUsedAt: clock, expiresAt: new Date(clock.getTime() - DAY) },
    ]);

    await login();

    const hashes = (await db.select({ hash: staffSessions.tokenHash }).from(staffSessions)).map((s) => s.hash);
    expect(hashes).not.toContain('expired-long-ago');
    expect(hashes).toContain('expired-yesterday');
    expect(hashes).toHaveLength(2); // yesterday's, plus the one just made
  });
});

describe('createStaff', () => {
  it('lower-cases the email, hashes the password and defaults to barista', async () => {
    const member = await createStaff(db, { name: ' Cris ', email: ' Cris@Example.com ', password: 'a long enough password' });
    expect(member).toMatchObject({ name: 'Cris', role: 'barista' });

    const [row] = await db.select().from(staff).where(eq(staff.id, member.id));
    expect(row?.email).toBe('cris@example.com');
    expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
    expect((await login('cris@example.com', 'a long enough password')).status).toBe(200);
  });

  it('refuses a short password, a bad email, an unknown role and a duplicate', async () => {
    await expect(createStaff(db, { name: 'X', email: 'x@example.com', password: 'short' })).rejects.toThrow(StaffCreateError);
    await expect(createStaff(db, { name: 'X', email: 'nope', password: 'a long enough password' })).rejects.toThrow(/Email/);
    await expect(createStaff(db, { name: 'X', email: 'x@example.com', password: 'a long enough password', role: 'owner' as 'manager' })).rejects.toThrow(StaffCreateError);
    await expect(createStaff(db, { name: 'Ana again', email: 'ANA@example.com', password: 'a long enough password' })).rejects.toThrow(/already an account/);
  });
});
