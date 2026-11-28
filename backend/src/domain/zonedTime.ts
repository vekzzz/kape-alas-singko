/** Helpers for "what time is it in the shop", without a date library. */

export type LocalMoment = { date: string; minutes: number; weekday: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function partsAt(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(instant).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The shop's local date, minutes since midnight and weekday at an instant. */
export function localMoment(instant: Date, timeZone: string): LocalMoment {
  const p = partsAt(instant, timeZone);
  const date = `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { date, minutes: p.hour * 60 + p.minute, weekday: weekdayOf(date) };
}

/** How many minutes the zone is ahead of UTC at an instant. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const p = partsAt(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
}

/** The instant at which the wall clock in `timeZone` shows `date` at `minutes` past midnight. */
export function instantAt(date: string, minutes: number, timeZone: string): Date {
  const naive = new Date(`${date}T00:00:00Z`).getTime() + minutes * 60_000;
  let instant = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  // Re-check once in case the guess landed on the other side of a clock change.
  instant = new Date(naive - offsetMinutes(instant, timeZone) * 60_000);
  return instant;
}

/** "05:00" or "05:00:00" to minutes since midnight. */
export function clockToMinutes(clock: string): number {
  const [hours = '0', minutes = '0'] = clock.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function minutesToClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
