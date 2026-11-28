import { orderResponseSchema } from '@kape/contract';
import type { OrderResponse } from '../lib/orders';

const KEEP_AFTER_PICKUP_MS = 2 * 60 * 60 * 1000;
export const MAX_ORDERS = 5;

export function isCurrent(order: OrderResponse, now = Date.now()): boolean {
  return now <= Date.parse(order.pickupAt) + KEEP_AFTER_PICKUP_MS;
}

/** Returns a saved order if it still has the shape the API sends, or null so it is dropped. */
export function cleanOrder(saved: unknown): OrderResponse | null {
  const parsed = orderResponseSchema.safeParse(saved);
  return parsed.success ? parsed.data : null;
}

export function keepCurrent(orders: OrderResponse[], now = Date.now()): OrderResponse[] {
  return orders
    .filter((order) => isCurrent(order, now))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
    .slice(0, MAX_ORDERS);
}
