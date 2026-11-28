import { createOrderRequestSchema } from '@kape/contract';
import { describe, expect, it } from 'vitest';
import { catalog } from '../test/menuFixture';
import { buildOrderRequest, isFinished, normalizePhone } from './orders';
import { defaultOptions, type CartLine } from './pricing';

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

describe('isFinished', () => {
  it('is true once an order is collected or cancelled, because nothing more will change', () => {
    expect(isFinished({ status: 'collected' })).toBe(true);
    expect(isFinished({ status: 'cancelled' })).toBe(true);
    expect(isFinished({ status: 'received' })).toBe(false);
    expect(isFinished({ status: 'ready' })).toBe(false);
  });
});

describe('buildOrderRequest', () => {
  const latte = catalog.getItem('latte');
  const details = { orderType: 'take-out', name: 'Maria', phone: null, pickupAt: '2026-11-28T01:15:00.000Z' } as const;
  const line = (itemId: string, changes: Partial<CartLine> = {}): CartLine => ({
    id: `${itemId}-1`,
    itemId,
    options: defaultOptions(catalog.getItem(itemId)),
    note: '',
    quantity: 1,
    ...changes,
  });

  it('sends choices as option group ids and value codes, never prices', () => {
    const large = line('latte', { options: { size: 'large', temperature: 'iced', milk: 'oat', extraShot: true }, note: ' less ice ', quantity: 2 });
    const request = buildOrderRequest([large], catalog, details);

    expect(request.lines).toEqual([
      { itemId: 'latte', options: { size: 'large', temperature: 'iced', milk: 'oat', extra_shot: 'extra' }, note: 'less ice', quantity: 2 },
    ]);
    expect(request.expectedTotalCentavos).toBe((170 + 30 + 40 + 50) * 2 * 100);
  });

  it('only sends the choices an item offers', () => {
    const request = buildOrderRequest([line('pandesal'), line('cold-brew'), line('alas-singko')], catalog, details);
    expect(request.lines.map((l) => l.options)).toEqual([{}, { size: 'regular', milk: 'none' }, { extra_shot: 'none' }]);
  });

  it('sends an empty note as null', () => {
    expect(buildOrderRequest([line('latte')], catalog, details).lines[0]?.note).toBeNull();
  });

  it('produces a request the API accepts', () => {
    const request = buildOrderRequest([line('latte'), line('pandesal', { note: 'warmed up' })], catalog, { ...details, phone: '09171234567' });
    expect(createOrderRequestSchema.safeParse(request).success).toBe(true);
    expect(latte.price).toBe(170);
  });
});
