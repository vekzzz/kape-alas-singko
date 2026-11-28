import { orderResponseSchema, staffOrderSchema, type OrderResponse, type StaffOrder } from '@kape/contract';
import { and, asc, eq, gt, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { optionGroups, orderItemOptions, orderItems, orderStatusEvents, orders } from '../db/schema.js';

type OrderRow = typeof orders.$inferSelect;
type LineRow = typeof orderItems.$inferSelect;
type EventRow = typeof orderStatusEvents.$inferSelect;

/** An order row with everything that hangs off it, ready to be shaped for a customer or for staff. */
type Hydrated = { row: OrderRow; lines: LineRow[]; labelsByLine: Map<number, string[]>; events: EventRow[] };

/** Loads the lines, option labels and history for many orders in four queries, however many orders there are. */
async function hydrate(db: Database, rows: OrderRow[]): Promise<Hydrated[]> {
  if (rows.length === 0) return [];
  const orderIds = rows.map((row) => row.id);

  const [lines, events] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).orderBy(asc(orderItems.position)),
    db.select().from(orderStatusEvents).where(inArray(orderStatusEvents.orderId, orderIds)).orderBy(asc(orderStatusEvents.changedAt), asc(orderStatusEvents.id)),
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

  const linesByOrder = Map.groupBy(lines, (line) => line.orderId);
  const eventsByOrder = Map.groupBy(events, (event) => event.orderId);
  const labelsByLine = new Map<number, string[]>();
  for (const option of options) labelsByLine.set(option.orderItemId, [...(labelsByLine.get(option.orderItemId) ?? []), option.label]);

  return rows.map((row) => ({ row, lines: linesByOrder.get(row.id) ?? [], labelsByLine, events: eventsByOrder.get(row.id) ?? [] }));
}

function customerShape({ row, lines, labelsByLine, events }: Hydrated) {
  return {
    publicId: row.publicId,
    number: row.number,
    status: row.status,
    cancelReason: row.cancelReason,
    orderType: row.orderType,
    name: row.customerName,
    pickupAt: row.pickupAt.toISOString(),
    placedAt: row.placedAt.toISOString(),
    totalCentavos: row.totalCentavos,
    paid: row.paidAt !== null,
    lines: lines.map((line) => ({
      itemName: line.itemName,
      optionLabels: labelsByLine.get(line.id) ?? [],
      note: line.note,
      quantity: line.quantity,
      unitPriceCentavos: line.unitPriceCentavos,
      lineTotalCentavos: line.lineTotalCentavos,
    })),
    events: events.map((event) => ({ status: event.status, at: event.changedAt.toISOString() })),
  };
}

// Parsing with the contract's schemas means the API can never send a shape the frontend would reject.
const toCustomerOrder = (hydrated: Hydrated): OrderResponse => orderResponseSchema.parse(customerShape(hydrated));

const toStaffOrder = (hydrated: Hydrated): StaffOrder =>
  staffOrderSchema.parse({
    ...customerShape(hydrated),
    businessDate: hydrated.row.businessDate,
    phone: hydrated.row.phone,
    paymentMethod: hydrated.row.paymentMethod,
    paidAt: hydrated.row.paidAt?.toISOString() ?? null,
    updatedAt: hydrated.row.updatedAt.toISOString(),
  });

async function selectOrders(db: Database, where: SQL | undefined) {
  return db.select().from(orders).where(where).orderBy(asc(orders.pickupAt), asc(orders.id)).limit(500);
}

async function loadOne(db: Database, where: SQL) {
  const rows = await selectOrders(db, where);
  return (await hydrate(db, rows.slice(0, 1)))[0] ?? null;
}

export async function loadOrderByPublicId(db: Database, publicId: string): Promise<OrderResponse | null> {
  const found = await loadOne(db, eq(orders.publicId, publicId));
  return found && toCustomerOrder(found);
}

export async function loadOrderByIdempotencyKey(db: Database, key: string): Promise<OrderResponse | null> {
  const found = await loadOne(db, eq(orders.idempotencyKey, key));
  return found && toCustomerOrder(found);
}

export async function loadStaffOrderByPublicId(db: Database, publicId: string): Promise<StaffOrder | null> {
  const found = await loadOne(db, eq(orders.publicId, publicId));
  return found && toStaffOrder(found);
}

/** One business day's orders, soonest pickup first. With `since`, only those that changed after it. */
export async function loadStaffOrdersForDay(db: Database, date: string, since?: Date): Promise<StaffOrder[]> {
  const where = and(eq(orders.businessDate, date), since ? gt(orders.updatedAt, since) : undefined);
  const rows = await selectOrders(db, where);
  return (await hydrate(db, rows)).map(toStaffOrder);
}
