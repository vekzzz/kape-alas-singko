import type { OpeningHours, ShopClosure, ShopResponse } from '@kape/contract';
import { MINUTES_PER_DAY, formatTime, manilaDate, manilaMinutes, manilaWeekday } from './time';

export function mapsUrl(shop: Pick<ShopResponse, 'name' | 'address'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.address}`)}`;
}

export function clockToMinutes(clock: string): number {
  const [hours = '0', minutes = '0'] = clock.split(':');
  return Number(hours) * 60 + Number(minutes);
}

type Day = { opens: number; closes: number };

/** The opening window on a Manila date, or null when the shop is closed that day. */
function windowOn(shop: Pick<ShopResponse, 'openingHours' | 'closures'>, date: string, weekday: number): Day | null {
  if (shop.closures.some((closure: ShopClosure) => closure.date === date)) return null;
  const hours = shop.openingHours.find((h: OpeningHours) => h.weekday === weekday);
  if (!hours || hours.isClosed) return null;
  return { opens: clockToMinutes(hours.opensAt), closes: clockToMinutes(hours.closesAt) };
}

export type OpenStatus = { open: true; closesAt: number } | { open: false; opensIn: number | null };

/** Whether the shop is open at `now`, and if not, how many minutes until it next opens. */
export function openStatus(shop: Pick<ShopResponse, 'openingHours' | 'closures'>, now: number): OpenStatus {
  const minutes = manilaMinutes(new Date(now));
  const today = windowOn(shop, manilaDate(now), manilaWeekday(now));
  if (today && minutes >= today.opens && minutes < today.closes) return { open: true, closesAt: today.closes };

  for (let ahead = 0; ahead <= 7; ahead++) {
    const later = now + ahead * MINUTES_PER_DAY * 60_000;
    const day = windowOn(shop, manilaDate(later), manilaWeekday(later));
    if (!day || (ahead === 0 && minutes >= day.opens)) continue;
    return { open: false, opensIn: ahead * MINUTES_PER_DAY + day.opens - minutes };
  }
  return { open: false, opensIn: null };
}

/** When the shop opens on the given Manila day, as minutes after midnight, or null when it does not. */
export function opensAtOn(shop: Pick<ShopResponse, 'openingHours' | 'closures'>, timestamp: number): number | null {
  return windowOn(shop, manilaDate(timestamp), manilaWeekday(timestamp))?.opens ?? null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every day, 5:00 AM to 9:00 PM", or one line per run of days that share hours. */
export function describeHours(hours: OpeningHours[]): string {
  const week = [1, 2, 3, 4, 5, 6, 0].map((weekday) => hours.find((h) => h.weekday === weekday));
  const label = (h: OpeningHours | undefined) => (!h || h.isClosed ? 'closed' : `${formatTime(clockToMinutes(h.opensAt))} to ${formatTime(clockToMinutes(h.closesAt))}`);

  const runs: { from: number; to: number; text: string }[] = [];
  week.forEach((h, index) => {
    const text = label(h);
    const last = runs.at(-1);
    if (last && last.text === text) last.to = index;
    else runs.push({ from: index, to: index, text });
  });

  if (runs.length === 1) return runs[0]!.text === 'closed' ? 'Closed' : `Every day, ${runs[0]!.text}`;
  const name = (index: number) => DAY_NAMES[[1, 2, 3, 4, 5, 6, 0][index]!]!;
  return runs.map((run) => `${run.from === run.to ? name(run.from) : `${name(run.from)} to ${name(run.to)}`}, ${run.text}`).join('. ');
}
