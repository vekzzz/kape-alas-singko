import { orderResponseSchema, type OrderResponse } from '@kape/contract';
import { asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { optionGroups, orderItemOptions, orderItems, orderStatusEvents, orders } from '../db/schema.js';

async function loadOrderWhere(db: Database, where: SQL): Promise<OrderResponse | null> {
  const [order] = await db.select().from(orders).where(where).limit(1);
  if (!order) return null;

  const [lines, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.position)),
    db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, order.id)).orderBy(asc(orderStatusEvents.changedAt), asc(orderStatusEvents.id)),
  ]);

  const options =
    lines.length === 0
      ? []
      : await db
          .select({ orderItemId: orderItemOptions.orderItemId, label: orderItemOptions.label })
          .from(orderItemOptions)
          .innerJoin(optionGroups, eq(optionGroups.id, orderItemOptions.optionGroupId))
          .where(inArray(orderItemOptions.orderItemId, lines.map((line) => line.id)))
          .orderBy(asc(optionGroups.position));
  const labelsByLine = Map.groupBy(options, (option) => option.orderItemId);

  // Parsing with the contract's schema means the API can never send a shape the frontend would reject.
  return orderResponseSchema.parse({
    publicId: order.publicId,
    number: order.number,
    status: order.status,
    cancelReason: order.cancelReason,
    orderType: order.orderType,
    name: order.customerName,
    pickupAt: order.pickupAt.toISOString(),
    placedAt: order.placedAt.toISOString(),
    totalCentavos: order.totalCentavos,
    paid: order.paidAt !== null,
    lines: lines.map((line) => ({
      itemName: line.itemName,
      optionLabels: (labelsByLine.get(line.id) ?? []).map((option) => option.label),
      note: line.note,
      quantity: line.quantity,
      unitPriceCentavos: line.unitPriceCentavos,
      lineTotalCentavos: line.lineTotalCentavos,
    })),
    events: events.map((event) => ({ status: event.status, at: event.changedAt.toISOString() })),
  });
}

export function loadOrderByPublicId(db: Database, publicId: string) {
  return loadOrderWhere(db, eq(orders.publicId, publicId));
}

export function loadOrderByIdempotencyKey(db: Database, key: string) {
  return loadOrderWhere(db, eq(orders.idempotencyKey, key));
}
