import type { PlacedOrder } from '../lib/orders';

const KEEP_AFTER_PICKUP_MS = 2 * 60 * 60 * 1000;
export const MAX_ORDERS = 5;

export function isCurrent(order: PlacedOrder, now = Date.now()): boolean {
  return now <= order.pickupAt + KEEP_AFTER_PICKUP_MS;
}

/** Returns a saved order in the shape the app expects, or null when it is not an order at all. */
export function cleanOrder(saved: unknown): PlacedOrder | null {
  if (!saved || typeof saved !== 'object') return null;
  const order = saved as PlacedOrder;
  if (typeof order.number !== 'string' || typeof order.pickupAt !== 'number' || !Array.isArray(order.lines)) return null;
  const orderType = order.orderType === 'dine-in' ? 'dine-in' : 'take-out';
  return { ...order, orderType, lines: order.lines.filter((line) => typeof line?.itemId === 'string') };
}

export function keepCurrent(orders: PlacedOrder[], now = Date.now()): PlacedOrder[] {
  return orders
    .filter((order) => isCurrent(order, now))
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, MAX_ORDERS);
}
