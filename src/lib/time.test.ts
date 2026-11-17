import { describe, expect, it } from 'vitest';
import { formatDuration, formatTime, isOpen, manilaMinutes, minutesUntilOpen } from './time';

describe('manilaMinutes', () => {
  it('converts UTC to Manila time', () => {
    expect(manilaMinutes(new Date('2026-11-14T21:00:00Z'))).toBe(5 * 60);
    expect(manilaMinutes(new Date('2026-11-14T06:30:00Z'))).toBe(14 * 60 + 30);
  });
});

describe('isOpen', () => {
  it('is open from 5:00 AM until just before 9:00 PM', () => {
    expect(isOpen(299)).toBe(false);
    expect(isOpen(300)).toBe(true);
    expect(isOpen(1259)).toBe(true);
    expect(isOpen(1260)).toBe(false);
  });
});

describe('minutesUntilOpen', () => {
  it('counts down to the first pour', () => {
    expect(minutesUntilOpen(4 * 60)).toBe(60);
    expect(minutesUntilOpen(22 * 60)).toBe(7 * 60);
    expect(minutesUntilOpen(600)).toBe(0);
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
