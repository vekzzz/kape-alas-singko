import { describe, expect, it } from 'vitest';
import { isOfferedSlot, pickupSlots, type SlotRules } from './pickupSlots.js';
import { instantAt, localMoment } from './zonedTime.js';

const everyDay = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '05:00', closesAt: '21:00', isClosed: false }));

const rules: SlotRules = {
  timezone: 'Asia/Manila',
  slotMinutes: 15,
  minLeadMinutes: 10,
  acceptingOrders: true,
  hours: everyDay,
  closedDates: new Set(),
};

/** A Manila wall-clock time on 2026-11-28 (a Saturday) as an instant. */
const manila = (clock: string, date = '2026-11-28') => {
  const [h = 0, m = 0] = clock.split(':').map(Number);
  return instantAt(date, h * 60 + m, 'Asia/Manila');
};

const clocks = (slots: Date[]) => slots.map((slot) => localMoment(slot, 'Asia/Manila')).map((m) => `${m.date} ${String(Math.floor(m.minutes / 60)).padStart(2, '0')}:${String(m.minutes % 60).padStart(2, '0')}`);

describe('zoned time', () => {
  it('reads Manila wall-clock time from a UTC instant', () => {
    expect(localMoment(new Date('2026-11-28T16:30:00Z'), 'Asia/Manila')).toEqual({ date: '2026-11-29', minutes: 30, weekday: 0 });
  });

  it('converts a Manila wall-clock time back to the right instant', () => {
    expect(manila('09:00').toISOString()).toBe('2026-11-28T01:00:00.000Z');
    expect(manila('00:00').toISOString()).toBe('2026-11-27T16:00:00.000Z');
  });
});

describe('pickupSlots', () => {
  it('starts at the next slot after the lead time', () => {
    // 09:00 + 10 min lead = 09:10, rounded up to the 09:15 slot.
    const { date, slots } = pickupSlots(manila('09:00'), rules);
    expect(date).toBe('2026-11-28');
    expect(clocks(slots)[0]).toBe('2026-11-28 09:15');
  });

  it('lets a slot that is exactly the lead time away through', () => {
    expect(clocks(pickupSlots(manila('09:05'), rules).slots)[0]).toBe('2026-11-28 09:15');
    expect(clocks(pickupSlots(manila('09:06'), rules).slots)[0]).toBe('2026-11-28 09:30');
  });

  it('ends one slot before closing', () => {
    const slots = clocks(pickupSlots(manila('20:00'), rules).slots);
    expect(slots.at(-1)).toBe('2026-11-28 20:45');
  });

  it('waits for opening when the shop has not opened yet', () => {
    const { date, slots } = pickupSlots(manila('03:00'), rules);
    expect(date).toBe('2026-11-28');
    expect(clocks(slots)[0]).toBe('2026-11-28 05:00');
    expect(slots).toHaveLength(64);
  });

  it('moves to tomorrow once today has no slots left', () => {
    const { date, slots } = pickupSlots(manila('20:40'), rules);
    expect(date).toBe('2026-11-29');
    expect(clocks(slots)[0]).toBe('2026-11-29 05:00');
  });

  it('never mixes two days', () => {
    const days = new Set(clocks(pickupSlots(manila('20:40'), rules).slots).map((c) => c.slice(0, 10)));
    expect([...days]).toEqual(['2026-11-29']);
  });

  it('skips closed dates and closed weekdays', () => {
    const closedTomorrow = { ...rules, closedDates: new Set(['2026-11-29']) };
    expect(pickupSlots(manila('20:40'), closedTomorrow).date).toBe('2026-11-30');

    // 2026-11-29 is a Sunday.
    const noSundays = { ...rules, hours: everyDay.map((h) => (h.weekday === 0 ? { ...h, isClosed: true } : h)) };
    expect(pickupSlots(manila('20:40'), noSundays).date).toBe('2026-11-30');
  });

  it('uses the hours of the weekday it is offering', () => {
    const shortSunday = { ...rules, hours: everyDay.map((h) => (h.weekday === 0 ? { ...h, opensAt: '07:00', closesAt: '12:00' } : h)) };
    const slots = clocks(pickupSlots(manila('20:40'), shortSunday).slots);
    expect(slots[0]).toBe('2026-11-29 07:00');
    expect(slots.at(-1)).toBe('2026-11-29 11:45');
  });

  it('offers nothing while orders are paused', () => {
    expect(pickupSlots(manila('09:00'), { ...rules, acceptingOrders: false })).toEqual({ date: null, slots: [] });
  });

  it('gives up when there is no open day within a week', () => {
    const allClosed = { ...rules, hours: everyDay.map((h) => ({ ...h, isClosed: true })) };
    expect(pickupSlots(manila('09:00'), allClosed)).toEqual({ date: null, slots: [] });
  });

  it('follows the shop date, not the UTC date', () => {
    // 2026-11-28 17:00 UTC is already 01:00 on the 29th in Manila.
    const { date, slots } = pickupSlots(new Date('2026-11-28T17:00:00Z'), rules);
    expect(date).toBe('2026-11-29');
    expect(clocks(slots)[0]).toBe('2026-11-29 05:00');
  });
});

describe('isOfferedSlot', () => {
  it('accepts an offered slot and rejects others', () => {
    const now = manila('09:00');
    expect(isOfferedSlot(manila('09:15'), now, rules)).toBe(true);
    expect(isOfferedSlot(manila('09:00'), now, rules)).toBe(false); // too soon
    expect(isOfferedSlot(manila('09:20'), now, rules)).toBe(false); // not on the grid
    expect(isOfferedSlot(manila('09:15', '2026-11-29'), now, rules)).toBe(false); // wrong day
  });
});
