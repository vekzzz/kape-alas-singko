import { getMenuItem, type MenuItem } from '../data/menu';

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

export const EXTRA_COSTS = { large: 30, oat: 40, extraShot: 50 } as const;

export function defaultOptions(item: MenuItem): DrinkOptions {
  const milkByDefault = item.hasMilk && item.id !== 'cold-brew';
  return {
    size: 'regular',
    temperature: item.icedOnly ? 'iced' : 'hot',
    milk: milkByDefault ? 'whole' : 'none',
    extraShot: false,
  };
}

export function unitPrice(item: MenuItem, options: DrinkOptions): number {
  let price = item.price;
  if (item.hasSizes && options.size === 'large') price += EXTRA_COSTS.large;
  if (item.hasMilk && options.milk === 'oat') price += EXTRA_COSTS.oat;
  if (item.hasExtraShot && options.extraShot) price += EXTRA_COSTS.extraShot;
  return price;
}

export function lineTotal(item: MenuItem, line: Pick<CartLine, 'options' | 'quantity'>): number {
  return unitPrice(item, line.options) * line.quantity;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(getMenuItem(line.itemId), line), 0);
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
  return `₱${amount}`;
}
