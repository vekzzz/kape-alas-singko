import type { PickupSlotsResponse } from '@kape/contract';
import { dayLabel, manilaMinutes } from './time';

export type PickupSlot = {
  /** Unique id for the radio buttons: the slot's ISO time. */
  value: string;
  pickupAt: number;
  /** Minutes after midnight on the Manila clock. */
  minutes: number;
  /** "today", "tomorrow" or a short date. */
  day: string;
};

/** The slots the server offers, with the labels the form needs. The server decides which times are valid. */
export function toPickupSlots(response: PickupSlotsResponse, now: number): PickupSlot[] {
  return response.slots.map(({ pickupAt }) => {
    const timestamp = Date.parse(pickupAt);
    return { value: pickupAt, pickupAt: timestamp, minutes: manilaMinutes(new Date(timestamp)), day: dayLabel(timestamp, now) };
  });
}
