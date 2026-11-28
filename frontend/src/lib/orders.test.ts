import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalog } from '../test/menuFixture';
import { newOrderNumber, normalizePhone, orderPayload, sendOrder, type PlacedOrder } from './orders';

const order: PlacedOrder = {
  number: 'A5-K7P',
  orderType: 'dine-in',
  name: 'Ana',
  phone: '09171234567',
  pickupAt: Date.parse('2026-11-18T23:15:00Z'),
  placedAt: Date.parse('2026-11-18T23:00:00Z'),
  lines: [{ id: 'l1', itemId: 'latte', options: { size: 'large', temperature: 'iced', milk: 'oat', extraShot: false }, note: 'less ice', quantity: 2 }],
  total: 0,
  sent: false,
};

describe('newOrderNumber', () => {
  it('is A5- and three easy-to-say characters', () => {
    for (let i = 0; i < 50; i++) expect(newOrderNumber()).toMatch(/^A5-[ACDEFGHJKMNPRTVWXY34679]{3}$/);
  });

  it('covers the whole alphabet', () => {
    expect(newOrderNumber(() => 0)).toBe('A5-AAA');
    expect(newOrderNumber(() => 0.9999)).toBe('A5-999');
  });
});

describe('normalizePhone', () => {
  it('accepts local and +63 mobile numbers', () => {
    expect(normalizePhone('0917 123 4567')).toBe('09171234567');
    expect(normalizePhone('+63 917-123-4567')).toBe('09171234567');
  });

  it('rejects anything else', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('0817 123 4567')).toBeNull();
    expect(normalizePhone('0917 123 45678')).toBeNull();
  });
});

describe('orderPayload', () => {
  it('spells out each line for the bar', () => {
    expect(orderPayload(order, catalog).items[0]).toMatchObject({ item: 'Latte', quantity: 2, note: 'less ice' });
    expect(orderPayload(order, catalog).items[0]?.options).toContain('Large');
    expect(orderPayload(order, catalog).pickupAt).toBe('2026-11-18T23:15:00.000Z');
  });

  it('tells the bar whether the order is for here or to go', () => {
    expect(orderPayload(order, catalog).orderType).toBe('dine-in');
  });
});

describe('sendOrder', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not send when no endpoint is set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendOrder(order, catalog, '')).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the number the endpoint replies with', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ number: 'A5-001' }))));
    await expect(sendOrder(order, catalog, 'https://example.test/orders')).resolves.toEqual({ sent: true, number: 'A5-001' });
  });

  it('accepts a reply that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));
    await expect(sendOrder(order, catalog, 'https://example.test/orders')).resolves.toEqual({ sent: true, number: undefined });
  });

  it('throws when the endpoint fails, so the cart is kept', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(sendOrder(order, catalog, 'https://example.test/orders')).rejects.toThrow('500');
  });
});
