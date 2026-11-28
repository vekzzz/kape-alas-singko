import { describe, expect, it } from 'vitest';
import { toPickupSlots } from './pickupSlots';

const now = Date.parse('2026-11-28T01:00:00Z'); // 9:00 AM Saturday in Manila

describe('toPickupSlots', () => {
  it('labels each slot with its Manila time and day', () => {
    const slots = toPickupSlots({ date: '2026-11-28', slots: [{ pickupAt: '2026-11-28T01:15:00.000Z' }, { pickupAt: '2026-11-28T01:30:00.000Z' }] }, now);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ value: '2026-11-28T01:15:00.000Z', pickupAt: Date.parse('2026-11-28T01:15:00Z'), minutes: 9 * 60 + 15, day: 'today' });
    expect(slots[1]?.minutes).toBe(9 * 60 + 30);
  });

  it('calls the next calendar day tomorrow, even from late in the evening', () => {
    const lateNow = Date.parse('2026-11-28T12:45:00Z'); // 8:45 PM
    const [slot] = toPickupSlots({ date: '2026-11-29', slots: [{ pickupAt: '2026-11-28T21:00:00.000Z' }] }, lateNow);
    expect(slot).toMatchObject({ day: 'tomorrow', minutes: 5 * 60 });
  });

  it('is empty when the server offers nothing', () => {
    expect(toPickupSlots({ date: null, slots: [] }, now)).toEqual([]);
  });
});
