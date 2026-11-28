import { MAX_QUANTITY } from '@kape/contract';
import type { CartLine, DrinkOptions } from '../lib/pricing';

/** Keeps only the saved lines that are well formed. Whether the items still exist is checked once the menu loads. */
export function parseCartLines(saved: unknown): CartLine[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter(isCartLine);
}

function isCartLine(line: unknown): line is CartLine {
  if (!line || typeof line !== 'object') return false;
  const { id, itemId, options, note, quantity } = line as Record<string, unknown>;
  if (typeof id !== 'string' || typeof itemId !== 'string' || typeof note !== 'string') return false;
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) return false;
  return isDrinkOptions(options);
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
