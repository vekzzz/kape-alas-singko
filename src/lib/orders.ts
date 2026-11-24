import { getMenuItem } from '../data/menu';
import { describeOptions, lineTotal, type CartLine } from './pricing';

export type PlacedOrder = {
  number: string;
  name: string;
  phone: string;
  pickupAt: number;
  placedAt: number;
  lines: CartLine[];
  total: number;
  sent: boolean;
};

const ORDER_ALPHABET = 'ACDEFGHJKMNPRTVWXY34679';
const SEND_TIMEOUT_MS = 10_000;

export function newOrderNumber(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 3; i++) code += ORDER_ALPHABET[Math.floor(random() * ORDER_ALPHABET.length)];
  return `A5-${code}`;
}

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

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
