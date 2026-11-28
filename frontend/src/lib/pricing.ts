import type { Catalog, MenuItem } from '../data/menu';

export type DrinkOptions = {
  size: 'regular' | 'large';
  temperature: 'hot' | 'iced';
  milk: 'whole' | 'oat' | 'none';
  extraShot: boolean;
};

export type CartLine = {
  id: string;
  itemId: string;
  options: DrinkOptions;
  note: string;
  quantity: number;
};

export function defaultOptions(item: MenuItem): DrinkOptions {
  return { ...item.defaults };
}

export function unitPrice(item: MenuItem, options: DrinkOptions): number {
  let price = item.price;
  if (item.hasSizes && options.size === 'large') price += item.extras.large;
  if (item.hasMilk && options.milk === 'oat') price += item.extras.oat;
  if (item.hasExtraShot && options.extraShot) price += item.extras.extraShot;
  return price;
}

export function lineTotal(item: MenuItem, line: Pick<CartLine, 'options' | 'quantity'>): number {
  return unitPrice(item, line.options) * line.quantity;
}

/** Lines for items that are no longer on the menu add nothing. */
export function cartTotal(lines: CartLine[], catalog: Catalog): number {
  return lines.reduce((sum, line) => {
    const item = catalog.findItem(line.itemId);
    return item ? sum + lineTotal(item, line) : sum;
  }, 0);
}

export function describeOptions(item: MenuItem, options: DrinkOptions): string {
  const parts: string[] = [];
  if (item.hasSizes) parts.push(options.size === 'large' ? 'Large' : 'Regular');
  if (item.hasTemperatures) parts.push(options.temperature);
  if (item.hasMilk) parts.push(options.milk === 'none' ? 'no milk' : `${options.milk} milk`);
  if (item.hasExtraShot && options.extraShot) parts.push('extra shot');
  return parts.join(', ');
}

export function formatPeso(amount: number): string {
  return Number.isInteger(amount) ? `₱${amount}` : `₱${amount.toFixed(2)}`;
}
