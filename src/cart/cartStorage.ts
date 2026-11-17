import { findMenuItem } from '../data/menu';
import type { CartLine } from '../lib/pricing';

const STORAGE_KEY = 'alas-singko-cart-v2';

export function loadCart(): CartLine[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(saved)) return [];
    // Drop lines for items that were taken off the menu since the last visit.
    return saved.filter((line): line is CartLine => Boolean(line && findMenuItem(line.itemId)));
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage can be blocked (private browsing). The cart still works for this visit.
  }
}
