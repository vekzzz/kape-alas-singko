export const MINUTES_PER_DAY = 24 * 60;

const MANILA_UTC_OFFSET = 8 * 60;

export function manilaMinutes(date: Date): number {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + MANILA_UTC_OFFSET) % MINUTES_PER_DAY;
}

/** Whole days since 1970-01-01 on the Manila calendar. */
export function manilaDay(timestamp: number): number {
  return Math.floor((timestamp + MANILA_UTC_OFFSET * 60_000) / (MINUTES_PER_DAY * 60_000));
}

/** 0 is Sunday, 6 is Saturday, on the Manila calendar. */
export function manilaWeekday(timestamp: number): number {
  return (manilaDay(timestamp) + 4) % 7;
}

/** The Manila calendar date as YYYY-MM-DD. */
export function manilaDate(timestamp: number): string {
  return new Date(timestamp + MANILA_UTC_OFFSET * 60_000).toISOString().slice(0, 10);
}

export function formatTime(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(wrapped / 60);
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mins = String(wrapped % 60).padStart(2, '0');
  return `${hours12}:${mins} ${hours24 < 12 ? 'AM' : 'PM'}`;
}

/** "today", "tomorrow" or a short date such as "Mon, Nov 30", by the Manila calendar. */
export function dayLabel(timestamp: number, now: number): string {
  const daysAway = manilaDay(timestamp) - manilaDay(now);
  if (daysAway === 0) return 'today';
  if (daysAway === 1) return 'tomorrow';
  return new Date(timestamp).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatPickup(pickupAt: number, now: number): string {
  const time = formatTime(manilaMinutes(new Date(pickupAt)));
  const label = dayLabel(pickupAt, now);
  return label === 'today' || label === 'tomorrow' ? `${time} ${label}` : `${time}, ${label}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}
