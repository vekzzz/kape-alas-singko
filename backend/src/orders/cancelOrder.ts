import type { OrderResponse } from '@kape/contract';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { orderStatusEvents, orders } from '../db/schema.js';
import { HttpError } from '../http.js';
import { loadOrderByPublicId } from './loadOrder.js';

/**
 * A customer can cancel until the bar starts the order. The update only applies while the status is still
 * "received", so a barista pressing Start at the same moment wins cleanly.
 */
export async function cancelOrderAsCustomer(db: Database, publicId: string): Promise<OrderResponse> {
  const cancelled = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: 'cancelled', cancelReason: 'customer_request', updatedAt: sql`now()` })
      .where(and(eq(orders.publicId, publicId), eq(orders.status, 'received')))
      .returning({ id: orders.id });
    if (!row) return false;
    await tx.insert(orderStatusEvents).values({ orderId: row.id, status: 'cancelled', actor: 'customer' });
    return true;
  });

  const order = await loadOrderByPublicId(db, publicId);
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'We could not find that order.');
  if (cancelled) return order;

  // Pressing Cancel twice is fine: the order is already cancelled the way they asked.
  if (order.status === 'cancelled' && order.cancelReason === 'customer_request') return order;
  throw new HttpError(409, 'CANNOT_CANCEL', "We've already started on this order, so please ask us at the counter.");
}
