import type { CreateOrderRequest, OrderResponse, OrderStatus, OrderType } from '@kape/contract';
import type { Catalog } from '../data/menu';
import { cartTotal, type CartLine } from './pricing';

export type { OrderResponse, OrderStatus, OrderType };

export const ORDER_TYPE_LABELS: Record<OrderType, string> = { 'dine-in': 'Dine in', 'take-out': 'Take out' };

/** Accepts 09XX or +639XX, with spaces or dashes, and returns the 09XXXXXXXXX form, or null if it is not a mobile number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

/** An order the bar has finished with: nothing more will change, so there is nothing left to check. */
export function isFinished(order: Pick<OrderResponse, 'status'>): boolean {
  return order.status === 'collected' || order.status === 'cancelled';
}

type CheckoutDetails = { orderType: OrderType; name: string; phone: string | null; pickupAt: string };

/**
 * What the customer picked, in the words the API uses: item ids and option choices, not prices.
 * The server prices the order itself; `expectedTotalCentavos` only lets it say "that changed" if the two differ.
 */
export function buildOrderRequest(lines: CartLine[], catalog: Catalog, details: CheckoutDetails): CreateOrderRequest {
  return {
    orderType: details.orderType,
    name: details.name,
    phone: details.phone,
    pickupAt: details.pickupAt,
    lines: lines.map((line) => {
      const item = catalog.getItem(line.itemId);
      const options: Record<string, string> = {};
      if (item.hasSizes) options.size = line.options.size;
      if (item.hasTemperatures) options.temperature = line.options.temperature;
      if (item.hasMilk) options.milk = line.options.milk;
      if (item.hasExtraShot) options.extra_shot = line.options.extraShot ? 'extra' : 'none';
      return { itemId: line.itemId, options, note: line.note.trim() || null, quantity: line.quantity };
    }),
    expectedTotalCentavos: Math.round(cartTotal(lines, catalog) * 100),
  };
}
