import type { OrderStatus, StaffOrder, StaffOrdersResponse } from '@kape/contract';

/** What the board holds: today's orders, and the cursor to ask "what changed?" with next time. */
export type BoardData = { date: string; orders: StaffOrder[]; cursor: string };

const byPickup = (a: StaffOrder, b: StaffOrder) => Date.parse(a.pickupAt) - Date.parse(b.pickupAt) || a.number.localeCompare(b.number);

/** Puts changed orders over the ones we already have, matching by `publicId`. A few can arrive twice; that is fine. */
export function mergeOrders(previous: StaffOrder[], changed: StaffOrder[]): StaffOrder[] {
  const byId = new Map(previous.map((order) => [order.publicId, order]));
  for (const order of changed) byId.set(order.publicId, order);
  return [...byId.values()].sort(byPickup);
}

/**
 * Folds a reply into what we hold. If the business day rolled over since the last poll, the reply only has
 * the new day's changes, not the whole day, so say "refetch" and let the caller ask again without a cursor.
 */
export function applyBoardReply(previous: BoardData | undefined, reply: StaffOrdersResponse): BoardData | 'refetch' {
  if (!previous) return { date: reply.date, orders: mergeOrders([], reply.orders), cursor: reply.cursor };
  if (reply.date !== previous.date) return 'refetch';
  return { date: reply.date, orders: mergeOrders(previous.orders, reply.orders), cursor: reply.cursor };
}

/** Swaps in one updated order, for example the answer to a button press. */
export function replaceOrder(data: BoardData | undefined, order: StaffOrder): BoardData | undefined {
  if (!data) return data;
  return { ...data, orders: mergeOrders(data.orders, [order]) };
}

export type Columns = { received: StaffOrder[]; preparing: StaffOrder[]; ready: StaffOrder[]; done: StaffOrder[] };

/** The three working columns, plus everything finished (collected or cancelled) for "Done today". */
export function groupOrders(orders: StaffOrder[]): Columns {
  const columns: Columns = { received: [], preparing: [], ready: [], done: [] };
  for (const order of orders) {
    if (order.status === 'received') columns.received.push(order);
    else if (order.status === 'preparing') columns.preparing.push(order);
    else if (order.status === 'ready') columns.ready.push(order);
    else columns.done.push(order);
  }
  // Newest finish first, so the order just handed over is at the top.
  columns.done.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return columns;
}

/** Orders that just arrived: `received`, and not among the ids the board has already seen. */
export function newOrders(seen: ReadonlySet<string>, orders: StaffOrder[]): StaffOrder[] {
  return orders.filter((order) => order.status === 'received' && !seen.has(order.publicId));
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'New',
  preparing: 'Making',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

const MINUTE = 60_000;

function minutes(ms: number): string {
  const total = Math.max(1, Math.round(ms / MINUTE));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export type Timing = { text: string; tone: 'calm' | 'soon' | 'late' };

/**
 * How the pickup time reads on a ticket: "in 12 min", "now", "5 min late". An order that is already ready
 * says how long it has been waiting on the counter instead, because that is what the barista needs to know.
 */
export function pickupTiming(order: Pick<StaffOrder, 'status' | 'pickupAt' | 'events'>, now: number): Timing {
  if (order.status === 'ready') {
    const readyAt = [...order.events].reverse().find((event) => event.status === 'ready')?.at;
    const waited = readyAt ? now - Date.parse(readyAt) : 0;
    return { text: waited < MINUTE ? 'Ready just now' : `Ready ${minutes(waited)} ago`, tone: waited > 15 * MINUTE ? 'late' : 'calm' };
  }
  if (order.status === 'collected' || order.status === 'cancelled') return { text: '', tone: 'calm' };

  const away = Date.parse(order.pickupAt) - now;
  if (away > 10 * MINUTE) return { text: `in ${minutes(away)}`, tone: 'calm' };
  if (away > MINUTE) return { text: `in ${minutes(away)}`, tone: 'soon' };
  if (away > -MINUTE) return { text: 'now', tone: 'soon' };
  return { text: `${minutes(-away)} late`, tone: 'late' };
}

/** A new order is flagged for two minutes after it was placed. */
export function isFresh(order: Pick<StaffOrder, 'status' | 'placedAt'>, now: number): boolean {
  return order.status === 'received' && now - Date.parse(order.placedAt) < 2 * MINUTE;
}
