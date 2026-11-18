import { getMenuItem } from '../data/menu';
import { describeOptions, lineTotal, type CartLine } from './pricing';

export type PlacedOrder = {
  number: string;
  name: string;
  phone: string;
  /** Timestamp of the start of the pickup slot. */
  pickupAt: number;
  placedAt: number;
  lines: CartLine[];
  total: number;
  /** True when the bar received the order; false when the customer must show it at the counter. */
  sent: boolean;
};

/** Letters and digits that are hard to mishear or misread (no 0/O, 1/I/L, 5/S, 2/Z, 8/B). */
const ORDER_ALPHABET = 'ACDEFGHJKMNPRTVWXY34679';
const SEND_TIMEOUT_MS = 10_000;

/** Short enough to say out loud at the counter, e.g. "A5-K7P". About 12,000 combinations. */
export function newOrderNumber(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 3; i++) code += ORDER_ALPHABET[Math.floor(random() * ORDER_ALPHABET.length)];
  return `A5-${code}`;
}

/** Philippine mobile numbers: 09XX XXX XXXX or +63 9XX XXX XXXX, spaces and dashes allowed. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

/** What the bar receives: plain names and prices, nothing that needs this app to read. */
export function orderPayload(order: PlacedOrder) {
  return {
    number: order.number,
    name: order.name,
    phone: order.phone,
    pickupAt: new Date(order.pickupAt).toISOString(),
    placedAt: new Date(order.placedAt).toISOString(),
    total: order.total,
    items: order.lines.map((line) => {
      const item = getMenuItem(line.itemId);
      return {
        item: item.name,
        options: describeOptions(item, line.options),
        note: line.note,
        quantity: line.quantity,
        lineTotal: lineTotal(item, line),
      };
    }),
  };
}

export type SendResult = { sent: true; number?: string } | { sent: false };

/**
 * Posts the order to VITE_ORDER_ENDPOINT (a webhook: Google Apps Script, Make, Zapier, your own API…).
 * The body is JSON sent as text/plain so the browser skips the CORS preflight that Apps Script cannot answer.
 * If the endpoint replies with JSON containing a "number", that number replaces the one made here.
 * With no endpoint configured, resolves to { sent: false } and the customer shows the order at the counter.
 * Throws when the endpoint is configured but the request fails, so the cart is kept and the customer can retry.
 */
export async function sendOrder(order: PlacedOrder, endpoint: string | undefined = import.meta.env.VITE_ORDER_ENDPOINT): Promise<SendResult> {
  if (!endpoint) return { sent: false };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(orderPayload(order)),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Order endpoint answered ${response.status}`);

  const reply: unknown = await response.json().catch(() => null);
  const number = reply && typeof reply === 'object' && 'number' in reply && typeof reply.number === 'string' ? reply.number : undefined;
  return { sent: true, number };
}
