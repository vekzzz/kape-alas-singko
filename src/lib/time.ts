// All times are minutes since midnight in Manila (UTC+8, no daylight saving).

export const MINUTES_PER_DAY = 24 * 60;
export const OPENING_TIME = 5 * 60;
export const CLOSING_TIME = 21 * 60;

const MANILA_UTC_OFFSET = 8 * 60;

export function manilaMinutes(date: Date): number {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + MANILA_UTC_OFFSET) % MINUTES_PER_DAY;
}

export function isOpen(minutes: number): boolean {
  return minutes >= OPENING_TIME && minutes < CLOSING_TIME;
}

export function minutesUntilOpen(minutes: number): number {
  if (isOpen(minutes)) return 0;
  if (minutes < OPENING_TIME) return OPENING_TIME - minutes;
  return MINUTES_PER_DAY - minutes + OPENING_TIME;
}

export function formatTime(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(wrapped / 60);
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mins = String(wrapped % 60).padStart(2, '0');
  return `${hours12}:${mins} ${hours24 < 12 ? 'AM' : 'PM'}`;
}

/** Days since the epoch, counted in Manila, so two timestamps can be compared by calendar day. */
export function manilaDay(timestamp: number): number {
  return Math.floor((timestamp + MANILA_UTC_OFFSET * 60_000) / (MINUTES_PER_DAY * 60_000));
}

/** "7:15 AM today", "5:00 AM tomorrow", or the date when it is further off. */
export function formatPickup(pickupAt: number, now: number): string {
  const time = formatTime(manilaMinutes(new Date(pickupAt)));
  const daysAway = manilaDay(pickupAt) - manilaDay(now);
  if (daysAway === 0) return `${time} today`;
  if (daysAway === 1) return `${time} tomorrow`;
  const date = new Date(pickupAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });
  return `${time}, ${date}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}
