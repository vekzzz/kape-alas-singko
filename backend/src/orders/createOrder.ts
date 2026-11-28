import type { CreateOrderInput, OrderResponse } from '@kape/contract';
import type { Database } from '../db/client.js';
import { orderItemOptions, orderItems, orderStatusEvents, orders, shopSettings } from '../db/schema.js';
import { isOfferedSlot } from '../domain/pickupSlots.js';
import { localMoment } from '../domain/zonedTime.js';
import { HttpError } from '../http.js';
import { loadMenu } from '../read/loadMenu.js';
import { loadSlotRules } from '../read/loadShop.js';
import { loadOrderByIdempotencyKey, loadOrderByPublicId } from './loadOrder.js';
import { generateOrderNumber, generatePublicId } from './orderNumber.js';
import { priceOrder } from './priceOrder.js';

const UNIQUE_VIOLATION = '23505';
const NUMBER_CLASH = 'orders_number_business_date_key';
const KEY_CLASH = 'orders_idempotency_key_unique';
const NUMBER_ATTEMPTS = 8;

export type CreateOrderDeps = {
  db: Database;
  now: () => Date;
  /** Makes an order number from the shop's prefix. Tests swap it to force a clash. */
  generateNumber?: (prefix: string) => string;
};

type PgError = { code?: string; constraint?: string };

/** Drizzle wraps the driver's error, so look at both levels. */
function pgError(error: unknown): PgError {
  const outer = error as PgError & { cause?: PgError };
  return outer.code ? outer : (outer.cause ?? {});
}

/**
 * Places an order. The server decides everything that matters: it prices the lines from the menu, picks the
 * order number, and checks the pickup time. Sending the same idempotency key again returns the first order.
 */
export async function createOrder(
  { db, now, generateNumber = generateOrderNumber }: CreateOrderDeps,
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<{ order: OrderResponse; created: boolean }> {
  // A retry (a double tap, or a reply lost on a slow connection) gets the original order back.
  const replay = await loadOrderByIdempotencyKey(db, idempotencyKey);
  if (replay) return { order: replay, created: false };

  const at = now();
  const rules = await loadSlotRules(db, at);
  if (!rules.acceptingOrders) {
    throw new HttpError(409, 'ORDERS_PAUSED', "We've paused online orders for now.");
  }

  const pickupAt = new Date(input.pickupAt);
  if (!isOfferedSlot(pickupAt, at, rules)) {
    throw new HttpError(409, 'SLOT_UNAVAILABLE', 'That pickup time is no longer available.');
  }

  const priced = priceOrder(await loadMenu(db), input.lines);
  if (!priced.ok) {
    throw new HttpError(409, 'ITEM_UNAVAILABLE', 'Something in your order is no longer available.', { details: { items: priced.unavailable } });
  }
  if (priced.totalCentavos !== input.expectedTotalCentavos) {
    throw new HttpError(409, 'PRICE_CHANGED', 'Prices changed while you were ordering.', { details: { totalCentavos: priced.totalCentavos } });
  }

  const [settings] = await db.select({ prefix: shopSettings.orderPrefix }).from(shopSettings).limit(1);
  const prefix = settings?.prefix ?? 'A5-';
  const businessDate = localMoment(pickupAt, rules.timezone).date;
  const publicId = generatePublicId();

  for (let attempt = 0; attempt < NUMBER_ATTEMPTS; attempt++) {
    try {
      await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            publicId,
            number: generateNumber(prefix),
            businessDate,
            idempotencyKey,
            orderType: input.orderType,
            customerName: input.name,
            phone: input.phone,
            pickupAt,
            placedAt: at,
            totalCentavos: priced.totalCentavos,
          })
          .returning({ id: orders.id });
        if (!order) throw new Error('Order insert returned no row');

        for (const [position, line] of priced.lines.entries()) {
          const [saved] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              menuItemId: line.itemId,
              itemName: line.itemName,
              unitPriceCentavos: line.unitPriceCentavos,
              quantity: line.quantity,
              lineTotalCentavos: line.lineTotalCentavos,
              note: line.note,
              position,
            })
            .returning({ id: orderItems.id });
          if (!saved) throw new Error('Order line insert returned no row');
          if (line.options.length > 0) {
            await tx.insert(orderItemOptions).values(line.options.map((option) => ({ orderItemId: saved.id, ...option })));
          }
        }

        await tx.insert(orderStatusEvents).values({ orderId: order.id, status: 'received', actor: 'customer', changedAt: at });
      });
    } catch (error) {
      const { code, constraint } = pgError(error);
      if (code === UNIQUE_VIOLATION && constraint === NUMBER_CLASH) continue; // someone took that number today: draw another
      if (code === UNIQUE_VIOLATION && constraint === KEY_CLASH) {
        // Two requests with the same key raced. The other one won, so return its order.
        const winner = await loadOrderByIdempotencyKey(db, idempotencyKey);
        if (winner) return { order: winner, created: false };
      }
      throw error;
    }

    const order = await loadOrderByPublicId(db, publicId);
    if (!order) throw new Error('Order vanished right after it was saved');
    return { order, created: true };
  }

  throw new HttpError(503, 'INTERNAL', 'We could not give your order a number. Please try again.');
}
