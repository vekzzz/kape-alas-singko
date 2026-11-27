import { findMenuItem } from '../data/menu';
import type { PlacedOrder } from '../lib/orders';

const STORAGE_KEY = 'alas-singko-orders-v2';
const OLD_STORAGE_KEY = 'alas-singko-last-order-v1';
const KEEP_AFTER_PICKUP_MS = 2 * 60 * 60 * 1000;
const MAX_ORDERS = 5;

export function isCurrent(order: PlacedOrder, now = Date.now()): boolean {
  return now <= order.pickupAt + KEEP_AFTER_PICKUP_MS;
}

export function cleanOrder(saved: unknown): PlacedOrder | null {
  if (!saved || typeof saved !== 'object') return null;
  const order = saved as PlacedOrder;
  if (typeof order.number !== 'string' || typeof order.pickupAt !== 'number' || !Array.isArray(order.lines)) return null;
  const orderType = order.orderType === 'dine-in' ? 'dine-in' : 'take-out';
  return { ...order, orderType, lines: order.lines.filter((line) => findMenuItem(line?.itemId)) };
}

export function keepCurrent(orders: PlacedOrder[], now = Date.now()): PlacedOrder[] {
  return orders
    .filter((order) => isCurrent(order, now))
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, MAX_ORDERS);
}

export function loadOrders(now = Date.now()): PlacedOrder[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const list = Array.isArray(saved) ? saved : [];
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      list.push(JSON.parse(old));
      localStorage.removeItem(OLD_STORAGE_KEY);
    }
    const orders = keepCurrent(list.map(cleanOrder).filter((order): order is PlacedOrder => order !== null), now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return orders;
  } catch {
    return [];
  }
}

export function saveOrders(orders: PlacedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}
