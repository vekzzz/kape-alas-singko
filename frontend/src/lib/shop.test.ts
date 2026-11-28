import type { ShopResponse } from '@kape/contract';
import { describe, expect, it } from 'vitest';
import { SHOP_FIXTURE } from '../test/menuFixture';
import { describeHours, mapsUrl, openStatus, opensAtOn } from './shop';

/** A Manila wall-clock time as an instant. 2026-11-28 is a Saturday. */
const manila = (date: string, clock: string) => Date.parse(`${date}T${clock}:00+08:00`);

describe('openStatus', () => {
  it('is open from opening until just before closing', () => {
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '04:59')).open).toBe(false);
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '05:00'))).toEqual({ open: true, closesAt: 21 * 60 });
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '20:59')).open).toBe(true);
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '21:00')).open).toBe(false);
  });

  it('counts down to the first pour', () => {
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '04:00'))).toEqual({ open: false, opensIn: 60 });
    expect(openStatus(SHOP_FIXTURE, manila('2026-11-28', '22:00'))).toEqual({ open: false, opensIn: 7 * 60 });
  });

  it('skips a closed day and a holiday when counting', () => {
    const noSundays: ShopResponse = { ...SHOP_FIXTURE, openingHours: SHOP_FIXTURE.openingHours.map((h) => (h.weekday === 0 ? { ...h, isClosed: true } : h)) };
    // Saturday 10 PM: Sunday is closed, so Monday 5 AM is 31 hours away.
    expect(openStatus(noSundays, manila('2026-11-28', '22:00'))).toEqual({ open: false, opensIn: 31 * 60 });

    const holiday: ShopResponse = { ...SHOP_FIXTURE, closures: [{ date: '2026-11-28', reason: 'Holiday' }] };
    expect(openStatus(holiday, manila('2026-11-28', '09:00'))).toEqual({ open: false, opensIn: 20 * 60 });
  });

  it('says so when there is no opening day in the coming week', () => {
    const closed: ShopResponse = { ...SHOP_FIXTURE, openingHours: SHOP_FIXTURE.openingHours.map((h) => ({ ...h, isClosed: true })) };
    expect(openStatus(closed, manila('2026-11-28', '09:00'))).toEqual({ open: false, opensIn: null });
  });
});

describe('opensAtOn', () => {
  it('gives the opening time of that day, or null when closed', () => {
    expect(opensAtOn(SHOP_FIXTURE, manila('2026-11-29', '12:00'))).toBe(300);
    const holiday: ShopResponse = { ...SHOP_FIXTURE, closures: [{ date: '2026-11-29', reason: 'Holiday' }] };
    expect(opensAtOn(holiday, manila('2026-11-29', '12:00'))).toBeNull();
  });
});

describe('describeHours', () => {
  it('writes one line when every day is the same', () => {
    expect(describeHours(SHOP_FIXTURE.openingHours)).toBe('Every day, 5:00 AM to 9:00 PM');
  });

  it('groups days that share hours, Monday first', () => {
    const hours = SHOP_FIXTURE.openingHours.map((h) => (h.weekday === 0 ? { ...h, opensAt: '07:00', closesAt: '12:00' } : h));
    expect(describeHours(hours)).toBe('Mon to Sat, 5:00 AM to 9:00 PM. Sun, 7:00 AM to 12:00 PM');
  });

  it('says closed for a closed day', () => {
    const hours = SHOP_FIXTURE.openingHours.map((h) => (h.weekday === 0 ? { ...h, isClosed: true } : h));
    expect(describeHours(hours)).toBe('Mon to Sat, 5:00 AM to 9:00 PM. Sun, closed');
  });
});

describe('mapsUrl', () => {
  it('searches for the shop by name and address', () => {
    const url = new URL(mapsUrl(SHOP_FIXTURE));
    expect(url.searchParams.get('query')).toBe('Kapé Alas-Singko, Magsaysay Avenue, Naga City, Camarines Sur');
  });
});
