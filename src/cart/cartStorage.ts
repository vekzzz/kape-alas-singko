import { findMenuItem } from '../data/menu';
import type { CartLine, DrinkOptions } from '../lib/pricing';

const STORAGE_KEY = 'alas-singko-cart-v2';
export const MAX_QUANTITY = 99;

export function loadCart(): CartLine[] {
  try {
    return parseCartLines(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {}
}

export function parseCartLines(saved: unknown): CartLine[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter(isOrderableLine);
}

function isOrderableLine(line: unknown): line is CartLine {
  if (!line || typeof line !== 'object') return false;
  const { id, itemId, options, note, quantity } = line as Record<string, unknown>;
  if (typeof id !== 'string' || typeof itemId !== 'string' || typeof note !== 'string') return false;
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) return false;
  const item = findMenuItem(itemId);
  return Boolean(item && !item.soldOut && isDrinkOptions(options));
}

function isDrinkOptions(options: unknown): options is DrinkOptions {
  if (!options || typeof options !== 'object') return false;
  const { size, temperature, milk, extraShot } = options as Record<string, unknown>;
  return (
    (size === 'regular' || size === 'large') &&
    (temperature === 'hot' || temperature === 'iced') &&
    (milk === 'whole' || milk === 'oat' || milk === 'none') &&
    typeof extraShot === 'boolean'
  );
}
