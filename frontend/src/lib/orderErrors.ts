import { priceChangedDetailsSchema, itemUnavailableDetailsSchema } from '@kape/contract';
import { ApiRequestError } from '../api/client';
import { formatPeso } from './pricing';

const COULD_NOT_REACH = "Hmm, we couldn't reach the bar. Check your connection and try again. Don't worry, your order is still here.";

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'something';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** What to tell the customer when placing an order did not work. */
export function placeOrderMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return COULD_NOT_REACH;

  switch (error.code) {
    case 'PRICE_CHANGED': {
      const details = priceChangedDetailsSchema.safeParse(error.details);
      return details.success
        ? `Prices changed while you were ordering. Your total is now ${formatPeso(details.data.totalCentavos / 100)}. Have a look and try again.`
        : 'Prices changed while you were ordering. Have a look at your order and try again.';
    }
    case 'ITEM_UNAVAILABLE': {
      const details = itemUnavailableDetailsSchema.safeParse(error.details);
      return `Sorry, ${details.success ? joinNames(details.data.items) : 'something in your order'} isn't available right now. Please check your order and try again.`;
    }
    case 'SLOT_UNAVAILABLE':
      return 'That pickup time just passed. Please pick another one.';
    case 'ORDERS_PAUSED':
      return "We've paused online orders for a little while. Please order at the counter instead.";
    case 'RATE_LIMITED':
      return "That's a lot of orders from one place! Please wait a minute and try again.";
    case 'VALIDATION':
      return Object.values(error.fields ?? {})[0] ?? "Something in your details doesn't look right. Please check them and try again.";
    default:
      return COULD_NOT_REACH;
  }
}

/** What to tell the customer when cancelling did not work. */
export function cancelOrderMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === 'CANNOT_CANCEL') {
    return "We've already started on your order, so please ask us at the counter.";
  }
  return "We couldn't cancel that just now. Check your connection and try again, or ask us at the counter.";
}

/** After these the menu or pickup times on screen are out of date, so look at them again. */
export function staleAfter(error: unknown): ('menu' | 'pickup-slots' | 'shop')[] {
  if (!(error instanceof ApiRequestError)) return [];
  switch (error.code) {
    case 'PRICE_CHANGED':
    case 'ITEM_UNAVAILABLE':
      return ['menu'];
    case 'SLOT_UNAVAILABLE':
      return ['pickup-slots', 'shop'];
    case 'ORDERS_PAUSED':
      return ['pickup-slots', 'shop'];
    default:
      return [];
  }
}
