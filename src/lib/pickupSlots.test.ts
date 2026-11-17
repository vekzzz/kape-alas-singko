import { describe, expect, it } from 'vitest';
import { pickupSlots } from './pickupSlots';

describe('pickupSlots', () => {
  it('starts at least ten minutes from now, on a quarter hour', () => {
    expect(pickupSlots(9 * 60 + 2)[0]).toMatchObject({ day: 'today', minutes: 9 * 60 + 15 });
    expect(pickupSlots(9 * 60 + 6)[0]?.minutes).toBe(9 * 60 + 30);
  });

  it('ends at 8:45 PM', () => {
    const slots = pickupSlots(600);
    expect(slots.at(-1)?.minutes).toBe(20 * 60 + 45);
  });

  it('offers opening time before the shop opens', () => {
    expect(pickupSlots(3 * 60)[0]).toMatchObject({ day: 'today', minutes: 300 });
    expect(pickupSlots(4 * 60 + 55)[0]?.minutes).toBe(315);
  });

  it('rolls over to tomorrow when no slot is left today', () => {
    expect(pickupSlots(20 * 60 + 40)[0]).toMatchObject({ day: 'tomorrow', minutes: 300 });
    expect(pickupSlots(23 * 60)[0]).toMatchObject({ day: 'tomorrow', minutes: 300 });
    expect(pickupSlots(20 * 60 + 35)[0]).toMatchObject({ day: 'today', minutes: 20 * 60 + 45 });
  });
});
