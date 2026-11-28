import { describe, expect, it } from 'vitest';
import { makeOrder } from '../test/orderFixture';
import { cleanOrder, isCurrent, keepCurrent } from './orderHistory';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-11-25T03:00:00Z');

function order(publicId: string, placedAgoHours: number, pickupAgoHours = placedAgoHours) {
  return makeOrder({
    publicId,
    placedAt: new Date(NOW - placedAgoHours * HOUR).toISOString(),
    pickupAt: new Date(NOW - pickupAgoHours * HOUR).toISOString(),
  });
}

describe('keepCurrent', () => {
  it('drops orders more than two hours past pickup', () => {
    const kept = keepCurrent([order('OLD', 3), order('NEW', 1)], NOW);
    expect(kept.map((o) => o.publicId)).toEqual(['NEW']);
  });

  it('puts the newest first and keeps at most five', () => {
    const many = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((ago, i) => order(`order-${i}`, ago));
    const kept = keepCurrent(many, NOW);
    expect(kept).toHaveLength(5);
    expect(kept[0]?.publicId).toBe('order-0');
  });
});

describe('isCurrent', () => {
  it('lasts until two hours after the pickup time', () => {
    const pickup = Date.parse('2026-11-25T03:00:00Z');
    const o = makeOrder({ pickupAt: new Date(pickup).toISOString() });
    expect(isCurrent(o, pickup + 2 * HOUR)).toBe(true);
    expect(isCurrent(o, pickup + 2 * HOUR + 1)).toBe(false);
  });
});

describe('cleanOrder', () => {
  it('keeps an order in the API shape', () => {
    const saved = makeOrder();
    expect(cleanOrder(saved)).toEqual(saved);
  });

  it('rejects things that are not orders, or are in an older shape', () => {
    expect(cleanOrder(null)).toBeNull();
    expect(cleanOrder({ number: 'A5-1' })).toBeNull();
    // The first version saved a number, pickup as milliseconds and lines of item ids.
    expect(cleanOrder({ number: 'A5-K7P', orderType: 'take-out', name: 'Ana', phone: '', pickupAt: 1, placedAt: 1, lines: [], total: 0, sent: true })).toBeNull();
  });
});
