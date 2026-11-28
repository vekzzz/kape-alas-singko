import { describe, expect, it } from 'vitest';
import { dayLabel, formatDuration, formatPickup, formatTime, manilaDate, manilaMinutes, manilaWeekday } from './time';

describe('manilaMinutes', () => {
  it('converts UTC to Manila time', () => {
    expect(manilaMinutes(new Date('2026-11-14T21:00:00Z'))).toBe(5 * 60);
    expect(manilaMinutes(new Date('2026-11-14T06:30:00Z'))).toBe(14 * 60 + 30);
  });
});

describe('manilaDate and manilaWeekday', () => {
  it('use the Manila calendar, not the UTC one', () => {
    // 17:00 UTC on Saturday the 28th is already 1 AM Sunday the 29th in Manila.
    const instant = Date.parse('2026-11-28T17:00:00Z');
    expect(manilaDate(instant)).toBe('2026-11-29');
    expect(manilaWeekday(instant)).toBe(0);
    expect(manilaWeekday(Date.parse('2026-11-28T01:00:00Z'))).toBe(6);
  });
});

describe('formatTime', () => {
  it('uses twelve-hour time', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(300)).toBe('5:00 AM');
    expect(formatTime(1245)).toBe('8:45 PM');
  });
});

describe('formatDuration', () => {
  it('drops the parts that are zero', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
  });
});

describe('formatPickup', () => {
  const now = Date.parse('2026-11-18T12:50:00Z');

  it('says today or tomorrow by the Manila calendar', () => {
    expect(formatPickup(Date.parse('2026-11-18T13:00:00Z'), now)).toBe('9:00 PM today');
    expect(formatPickup(Date.parse('2026-11-18T21:00:00Z'), now)).toBe('5:00 AM tomorrow');
  });

  it('turns a saved "tomorrow" into "today" once the day comes', () => {
    expect(formatPickup(Date.parse('2026-11-18T21:00:00Z'), Date.parse('2026-11-18T20:00:00Z'))).toBe('5:00 AM today');
  });

  it('names the date when it is further away', () => {
    expect(formatPickup(Date.parse('2026-11-22T01:00:00Z'), now)).toMatch(/^9:00 AM, .*22/);
  });
});

describe('dayLabel', () => {
  it('is today, tomorrow or a date', () => {
    const now = Date.parse('2026-11-18T03:00:00Z');
    expect(dayLabel(Date.parse('2026-11-18T10:00:00Z'), now)).toBe('today');
    expect(dayLabel(Date.parse('2026-11-19T01:00:00Z'), now)).toBe('tomorrow');
    expect(dayLabel(Date.parse('2026-11-23T01:00:00Z'), now)).toMatch(/Nov/);
  });
});
