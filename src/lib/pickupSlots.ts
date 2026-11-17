import { CLOSING_TIME, OPENING_TIME, formatTime } from './time';

export const SLOT_LENGTH = 15;
export const MIN_LEAD_TIME = 10;
const LAST_SLOT = CLOSING_TIME - SLOT_LENGTH;

export type PickupSlot = {
  day: 'today' | 'tomorrow';
  minutes: number;
  label: string;
  value: string;
};

/** Every quarter hour while the shop is open, starting at least ten minutes from now. */
export function pickupSlots(nowMinutes: number): PickupSlot[] {
  const earliest = Math.ceil((nowMinutes + MIN_LEAD_TIME) / SLOT_LENGTH) * SLOT_LENGTH;
  let day: PickupSlot['day'] = 'today';
  let start = Math.max(OPENING_TIME, earliest);

  if (start > LAST_SLOT) {
    day = 'tomorrow';
    start = OPENING_TIME;
  }

  const slots: PickupSlot[] = [];
  for (let minutes = start; minutes <= LAST_SLOT; minutes += SLOT_LENGTH) {
    slots.push({ day, minutes, label: `${formatTime(minutes)} ${day}`, value: `${day}-${minutes}` });
  }
  return slots;
}
