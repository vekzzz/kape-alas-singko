import { findMenuItem } from '../data/menu';
import type { PlacedOrder } from '../lib/orders';

const STORAGE_KEY = 'alas-singko-last-order-v1';
const KEEP_AFTER_PICKUP_MS = 2 * 60 * 60 * 1000;

export function loadLastOrder(now = Date.now()): PlacedOrder | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    const order = saved as PlacedOrder;
    if (typeof order.number !== 'string' || typeof order.pickupAt !== 'number' || !Array.isArray(order.lines)) return null;
    if (now > order.pickupAt + KEEP_AFTER_PICKUP_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { ...order, lines: order.lines.filter((line) => findMenuItem(line?.itemId)) };
  } catch {
    return null;
  }
}

export function saveLastOrder(order: PlacedOrder) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {}
}
