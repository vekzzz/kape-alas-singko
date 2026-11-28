import { statusMove, type StaffOrder, type StaffStatusRequest } from '@kape/contract';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { PaymentMethod } from '@kape/contract';
import type { Database } from '../db/client.js';
import { menuItems, orderStatusEvents, orders, shopSettings } from '../db/schema.js';
import { HttpError } from '../http.js';
import { loadStaffOrderByPublicId } from '../orders/loadOrder.js';

const notFound = () => new HttpError(404, 'NOT_FOUND', 'We could not find that order.');

/**
 * Moves an order one step forward or back, or cancels it. The caller says what it thinks the status is
 * (`from`); the update only applies if that is still true, so two baristas tapping at once, or a stale board,
 * cannot step on each other. Every change is written to the order's history with who made it.
 */
export async function changeOrderStatus(db: Database, staffId: number, publicId: string, request: Required<Pick<StaffStatusRequest, 'from' | 'to'>> & { reason?: StaffStatusRequest['reason'] }): Promise<StaffOrder> {
  if (!statusMove(request.from, request.to)) {
    throw new HttpError(400, 'INVALID_TRANSITION', `An order can't go from ${request.from} to ${request.to}.`);
  }

  const applied = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: request.to, cancelReason: request.to === 'cancelled' ? (request.reason ?? 'other') : null, updatedAt: sql`now()` })
      .where(and(eq(orders.publicId, publicId), eq(orders.status, request.from)))
      .returning({ id: orders.id });
    if (!row) return false;
    await tx.insert(orderStatusEvents).values({ orderId: row.id, status: request.to, actor: 'staff', staffId });
    return true;
  });

  const current = await loadStaffOrderByPublicId(db, publicId);
  if (!current) throw notFound();
  if (applied) return current;
  throw new HttpError(409, 'STATUS_CONFLICT', `Someone already changed this order. It is now ${current.status}.`, { details: { order: current } });
}

/** Records how an order was paid at the counter. Paying again corrects the method and keeps the first time. */
export async function recordPayment(db: Database, publicId: string, method: PaymentMethod): Promise<StaffOrder> {
  const [row] = await db
    .update(orders)
    .set({ paymentMethod: method, paidAt: sql`coalesce(${orders.paidAt}, now())`, updatedAt: sql`now()` })
    .where(and(eq(orders.publicId, publicId), ne(orders.status, 'cancelled')))
    .returning({ id: orders.id });

  const current = await loadStaffOrderByPublicId(db, publicId);
  if (!current) throw notFound();
  if (!row) throw new HttpError(409, 'INVALID_TRANSITION', "A cancelled order can't be paid.");
  return current;
}

/** Marks an item sold out (or back on). Customers see it within a minute; checkout refuses it straight away. */
export async function setItemSoldOut(db: Database, itemId: string, isSoldOut: boolean): Promise<{ id: string; isSoldOut: boolean }> {
  const [row] = await db.update(menuItems).set({ isSoldOut, updatedAt: sql`now()` }).where(eq(menuItems.id, itemId)).returning({ id: menuItems.id, isSoldOut: menuItems.isSoldOut });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'We could not find that menu item.');
  return row;
}

/** Pauses or resumes online orders. While paused there are no pickup times and checkout refuses. */
export async function setAcceptingOrders(db: Database, acceptingOrders: boolean): Promise<{ acceptingOrders: boolean }> {
  const [row] = await db.update(shopSettings).set({ acceptingOrders, updatedAt: sql`now()` }).where(eq(shopSettings.id, 1)).returning({ acceptingOrders: shopSettings.acceptingOrders });
  if (!row) throw new Error('shop_settings is empty. Run "npm run db:seed".');
  return row;
}
