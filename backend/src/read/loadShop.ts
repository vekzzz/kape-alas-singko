import type { ShopResponse } from '@kape/contract';
import { asc, gte } from 'drizzle-orm';
import type { SlotRules } from '../domain/pickupSlots.js';
import { localMoment, minutesToClock, clockToMinutes } from '../domain/zonedTime.js';
import type { Database } from '../db/client.js';
import { openingHours, shopClosures, shopSettings } from '../db/schema.js';

async function readShop(db: Database, now: Date) {
  const [settings] = await db.select().from(shopSettings).limit(1);
  if (!settings) throw new Error('shop_settings is empty. Run "npm run db:seed".');
  const today = localMoment(now, settings.timezone).date;
  const [hours, closures] = await Promise.all([
    db.select().from(openingHours).orderBy(asc(openingHours.weekday)),
    db.select().from(shopClosures).where(gte(shopClosures.closedOn, today)).orderBy(asc(shopClosures.closedOn)),
  ]);
  return { settings, hours, closures };
}

const toClock = (value: string) => minutesToClock(clockToMinutes(value));

export async function loadShop(db: Database, now: Date): Promise<ShopResponse> {
  const { settings, hours, closures } = await readShop(db, now);
  return {
    name: settings.name,
    address: settings.address,
    timezone: settings.timezone,
    acceptingOrders: settings.acceptingOrders,
    slotMinutes: settings.slotMinutes,
    minLeadMinutes: settings.minLeadMinutes,
    openingHours: hours.map((h) => ({ weekday: h.weekday, opensAt: toClock(h.opensAt), closesAt: toClock(h.closesAt), isClosed: h.isClosed })),
    closures: closures.map((c) => ({ date: c.closedOn, reason: c.reason })),
  };
}

/** What the slot calculator needs, read from the database. */
export async function loadSlotRules(db: Database, now: Date): Promise<SlotRules> {
  const { settings, hours, closures } = await readShop(db, now);
  return {
    timezone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    minLeadMinutes: settings.minLeadMinutes,
    acceptingOrders: settings.acceptingOrders,
    hours: hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt, isClosed: h.isClosed })),
    closedDates: new Set(closures.map((c) => c.closedOn)),
  };
}
