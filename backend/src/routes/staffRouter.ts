import {
  staffLoginRequestSchema,
  staffMenuItemPatchSchema,
  staffPaymentRequestSchema,
  staffShopPatchSchema,
  staffStatusRequestSchema,
  type StaffLoginResponse,
  type StaffMeResponse,
  type StaffOrdersResponse,
} from '@kape/contract';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { spendPasswordCheck, verifyPassword } from '../auth/passwords.js';
import { requireStaff, staffOf } from '../auth/requireStaff.js';
import { createSession, revokeSession } from '../auth/sessions.js';
import type { Database } from '../db/client.js';
import { staff } from '../db/schema.js';
import { localMoment } from '../domain/zonedTime.js';
import { HttpError, errorBody, parseOrThrow } from '../http.js';
import { loadStaffOrdersForDay } from '../orders/loadOrder.js';
import { PUBLIC_ID_PATTERN } from '../orders/orderNumber.js';
import { loadShopTimezone } from '../read/loadTimezone.js';
import { clearOldData } from '../staff/housekeeping.js';
import { changeOrderStatus, recordPayment, setAcceptingOrders, setItemSoldOut } from '../staff/staffOrders.js';

export type StaffRouterOptions = {
  db: Database;
  now: () => Date;
  /** Sign-in attempts one address may make per 15 minutes. */
  loginAttempts: number;
  log?: (message: string, error: unknown) => void;
};

/** How far behind "now" the polling cursor runs, so an order saved a moment before the poll is never missed. */
const CURSOR_LAG_MS = 5_000;

const ordersQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-28')
    .optional(),
  since: z.iso.datetime('Use the cursor from the last reply').optional(),
});

function publicIdFrom(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !PUBLIC_ID_PATTERN.test(value)) throw new HttpError(404, 'NOT_FOUND', 'We could not find that order.');
  return value;
}

/** Everything bar staff do: sign in, run the order board, mark items sold out, pause online orders. */
export function createStaffRouter({ db, now, loginAttempts, log }: StaffRouterOptions) {
  const router = Router();

  const loginLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: loginAttempts,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorBody('RATE_LIMITED', 'Too many sign-in attempts. Please wait a few minutes and try again.'));
    },
  });

  router.post('/login', loginLimit, async (req, res) => {
    const { email, password } = parseOrThrow(staffLoginRequestSchema, req.body);
    const [member] = await db.select().from(staff).where(eq(staff.email, email)).limit(1);

    // The same answer, and about the same time, whether the email is unknown, switched off, or the password is wrong.
    const signedIn = member?.isActive ? await verifyPassword(member.passwordHash, password) : (await spendPasswordCheck(password), false);
    if (!member || !signedIn) throw new HttpError(401, 'UNAUTHENTICATED', 'That email and password do not match.');

    const at = now();
    const session = await createSession(db, member.id, at);

    // No scheduler on the free host, so tidy up old phone numbers and sessions when someone signs in.
    try {
      await clearOldData(db, at);
    } catch (error) {
      log?.('Clearing old data failed', error);
    }

    const body: StaffLoginResponse = {
      token: session.token,
      staff: { id: member.id, name: member.name, role: member.role as StaffLoginResponse['staff']['role'] },
      expiresAt: session.expiresAt.toISOString(),
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  // Everything below needs a signed-in staff member.
  router.use(requireStaff({ db, now }));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/me', (_req, res) => {
    const { sessionId: _sessionId, expiresAt, ...member } = staffOf(res);
    const body: StaffMeResponse = { staff: member, expiresAt: expiresAt.toISOString() };
    res.json(body);
  });

  router.post('/logout', async (_req, res) => {
    await revokeSession(db, staffOf(res).sessionId, now());
    res.json({ ok: true });
  });

  router.get('/orders', async (req, res) => {
    const query = parseOrThrow(ordersQuerySchema, req.query);
    const at = now();
    const date = query.date ?? localMoment(at, await loadShopTimezone(db)).date;
    const orders = await loadStaffOrdersForDay(db, date, query.since ? new Date(query.since) : undefined);
    const body: StaffOrdersResponse = { date, orders, cursor: new Date(at.getTime() - CURSOR_LAG_MS).toISOString() };
    res.json(body);
  });

  router.post('/orders/:publicId/status', async (req, res) => {
    const request = parseOrThrow(staffStatusRequestSchema, req.body);
    res.json(await changeOrderStatus(db, staffOf(res).id, publicIdFrom(req.params.publicId), request));
  });

  router.post('/orders/:publicId/payment', async (req, res) => {
    const { method } = parseOrThrow(staffPaymentRequestSchema, req.body);
    res.json(await recordPayment(db, publicIdFrom(req.params.publicId), method));
  });

  router.patch('/menu-items/:id', async (req, res) => {
    const { isSoldOut } = parseOrThrow(staffMenuItemPatchSchema, req.body);
    res.json(await setItemSoldOut(db, String(req.params.id), isSoldOut));
  });

  router.patch('/shop', async (req, res) => {
    const { acceptingOrders } = parseOrThrow(staffShopPatchSchema, req.body);
    res.json(await setAcceptingOrders(db, acceptingOrders));
  });

  return router;
}
