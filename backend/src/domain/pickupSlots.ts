import { addDays, clockToMinutes, instantAt, localMoment, weekdayOf } from './zonedTime.js';

export type SlotRules = {
  timezone: string;
  slotMinutes: number;
  minLeadMinutes: number;
  acceptingOrders: boolean;
  /** Keyed by weekday, 0 is Sunday. A missing weekday counts as closed. */
  hours: { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];
  /** Dates (YYYY-MM-DD) the shop is closed. */
  closedDates: ReadonlySet<string>;
};

export type PickupSlots = { date: string | null; slots: Date[] };

/** How many days ahead we look for the next open day. */
export const LOOK_AHEAD_DAYS = 7;

/**
 * Pickup times a customer can choose right now: every slot on the current business day that is
 * still at least `minLeadMinutes` away, or, when none is left, every slot on the next open day.
 * The last slot starts one slot length before closing. Never offers two days at once.
 */
export function pickupSlots(now: Date, rules: SlotRules): PickupSlots {
  if (!rules.acceptingOrders) return { date: null, slots: [] };

  const local = localMoment(now, rules.timezone);
  const earliestToday = Math.ceil((local.minutes + rules.minLeadMinutes) / rules.slotMinutes) * rules.slotMinutes;

  for (let ahead = 0; ahead <= LOOK_AHEAD_DAYS; ahead++) {
    const date = addDays(local.date, ahead);
    if (rules.closedDates.has(date)) continue;
    const hours = rules.hours.find((h) => h.weekday === weekdayOf(date));
    if (!hours || hours.isClosed) continue;

    const opens = clockToMinutes(hours.opensAt);
    const lastStart = clockToMinutes(hours.closesAt) - rules.slotMinutes;
    const first = ahead === 0 ? Math.max(opens, earliestToday) : opens;

    const slots: Date[] = [];
    for (let minutes = first; minutes <= lastStart; minutes += rules.slotMinutes) {
      slots.push(instantAt(date, minutes, rules.timezone));
    }
    if (slots.length > 0) return { date, slots };
  }
  return { date: null, slots: [] };
}

/** Whether a pickup time is one of the slots offered right now. Used when an order is placed. */
export function isOfferedSlot(pickupAt: Date, now: Date, rules: SlotRules): boolean {
  return pickupSlots(now, rules).slots.some((slot) => slot.getTime() === pickupAt.getTime());
}
