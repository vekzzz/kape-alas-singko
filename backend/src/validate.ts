export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'collected'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderInput = {
  number: string;
  orderType: 'dine-in' | 'take-out';
  name: string;
  phone: string;
  pickupAt: string;
  placedAt: string;
  total: number;
  items: {
    item: string;
    options: string;
    note?: string;
    quantity: number;
    lineTotal: number;
  }[];
};

const NUMBER_PATTERN = /^A5-[A-Z0-9]{3}$/;

export function isOrderNumber(value: unknown): value is string {
  return typeof value === 'string' && NUMBER_PATTERN.test(value);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Returns the cleaned order, or a message saying what is wrong. */
export function parseOrder(body: unknown): { ok: true; order: OrderInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  const b = body as Record<string, unknown>;

  if (!isOrderNumber(b.number)) return { ok: false, error: 'number must look like A5-XXX' };
  if (b.orderType !== 'dine-in' && b.orderType !== 'take-out') return { ok: false, error: 'orderType must be dine-in or take-out' };
  if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80) return { ok: false, error: 'name is required (max 80 characters)' };
  if (typeof b.phone !== 'string' || !/^09\d{9}$/.test(b.phone)) return { ok: false, error: 'phone must be an 11-digit 09XXXXXXXXX number' };
  if (!isDate(b.pickupAt)) return { ok: false, error: 'pickupAt must be an ISO date' };
  if (!isDate(b.placedAt)) return { ok: false, error: 'placedAt must be an ISO date' };
  if (!isMoney(b.total)) return { ok: false, error: 'total must be a non-negative number' };
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 50) return { ok: false, error: 'items must be a list of 1 to 50 entries' };

  const items: OrderInput['items'] = [];
  for (const raw of b.items) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'each item must be an object' };
    const i = raw as Record<string, unknown>;
    if (typeof i.item !== 'string' || !i.item.trim()) return { ok: false, error: 'item name is required' };
    if (typeof i.quantity !== 'number' || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99) return { ok: false, error: 'quantity must be a whole number from 1 to 99' };
    if (!isMoney(i.lineTotal)) return { ok: false, error: 'lineTotal must be a non-negative number' };
    items.push({
      item: i.item,
      options: typeof i.options === 'string' ? i.options : '',
      note: typeof i.note === 'string' && i.note.trim() ? i.note : undefined,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    });
  }

  return {
    ok: true,
    order: {
      number: b.number,
      orderType: b.orderType,
      name: b.name.trim(),
      phone: b.phone,
      pickupAt: b.pickupAt,
      placedAt: b.placedAt,
      total: b.total,
      items,
    },
  };
}
