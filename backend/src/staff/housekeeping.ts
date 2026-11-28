import { and, inArray, isNotNull, lt, or } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { orders, staffSessions } from '../db/schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long a customer's phone number is kept once their order is done. */
export const PHONE_KEEP_DAYS = 30;
const SESSION_KEEP_DAYS = 7;

/**
 * Clears what is no longer needed: customers' phone numbers 30 days after their order was collected or
 * cancelled (a mobile number is personal data, and after the shift it is only useful for settling a dispute),
 * and sessions that ended a week ago. There is no scheduler on the free host, so this runs when staff sign in.
 * "Done" is when the order last changed, which for a finished order is its last step or payment.
 */
export async function clearOldData(db: Database, now: Date): Promise<{ phones: number; sessions: number }> {
  const phoneCutoff = new Date(now.getTime() - PHONE_KEEP_DAYS * DAY_MS);
  const sessionCutoff = new Date(now.getTime() - SESSION_KEEP_DAYS * DAY_MS);

  const phones = await db
    .update(orders)
    .set({ phone: null })
    .where(and(isNotNull(orders.phone), inArray(orders.status, ['collected', 'cancelled']), lt(orders.updatedAt, phoneCutoff)))
    .returning({ id: orders.id });

  const sessions = await db
    .delete(staffSessions)
    .where(or(lt(staffSessions.expiresAt, sessionCutoff), lt(staffSessions.revokedAt, sessionCutoff)))
    .returning({ id: staffSessions.id });

  return { phones: phones.length, sessions: sessions.length };
}
