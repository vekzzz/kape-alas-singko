import type { OrderType } from '../lib/orders';

const STORAGE_KEY = 'alas-singko-order-type-v1';

export function loadOrderType(): OrderType | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved === 'dine-in' || saved === 'take-out' ? saved : null;
  } catch {
    return null;
  }
}

export function saveOrderType(orderType: OrderType) {
  try {
    sessionStorage.setItem(STORAGE_KEY, orderType);
  } catch {}
}
