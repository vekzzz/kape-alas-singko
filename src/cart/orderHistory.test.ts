import { describe, expect, it } from 'vitest';
import type { PlacedOrder } from '../lib/orders';
import { cleanOrder, keepCurrent } from './orderHistory';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-11-25T03:00:00Z');

function order(number: string, placedAgoHours: number, pickupAgoHours = placedAgoHours): PlacedOrder {
  return {
    number,
    orderType: 'take-out',
    name: 'Ana',
    phone: '',
    placedAt: NOW - placedAgoHours * HOUR,
    pickupAt: NOW - pickupAgoHours * HOUR,
    lines: [],
    total: 0,
    sent: true,
  };
}

describe('keepCurrent', () => {
  it('drops orders more than two hours past pickup', () => {
    const kept = keepCurrent([order('A5-OLD', 3), order('A5-NEW', 1)], NOW);
    expect(kept.map((o) => o.number)).toEqual(['A5-NEW']);
  });

  it('puts the newest first and keeps at most five', () => {
    const many = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((ago, i) => order(`A5-00${i}`, ago));
    const kept = keepCurrent(many, NOW);
    expect(kept).toHaveLength(5);
    expect(kept[0]?.number).toBe('A5-000');
  });
});

describe('cleanOrder', () => {
  it('rejects things that are not orders', () => {
    expect(cleanOrder(null)).toBeNull();
    expect(cleanOrder({ number: 'A5-1' })).toBeNull();
  });

  it('treats orders saved before dine in existed as take out', () => {
    const { orderType: _, ...older } = order('A5-OLD', 0);
    expect(cleanOrder(older)?.orderType).toBe('take-out');
  });

  it('drops lines for items no longer on the menu', () => {
    const saved = { ...order('A5-X', 0), lines: [{ id: 'a', itemId: 'latte' }, { id: 'b', itemId: 'gone' }] };
    expect(cleanOrder(saved)?.lines.map((line) => line.itemId)).toEqual(['latte']);
  });
});
