import type { PickupSlotsResponse } from '@kape/contract';
import { Router } from 'express';
import type { Database } from '../db/client.js';
import { pickupSlots } from '../domain/pickupSlots.js';
import { loadMenu } from '../read/loadMenu.js';
import { loadShop, loadSlotRules } from '../read/loadShop.js';

type Options = { db: Database; now: () => Date };

/** Routes anyone can call: the menu, the shop's hours and the pickup times on offer. */
export function createPublicRouter({ db, now }: Options) {
  const router = Router();

  // Express adds an ETag and answers If-None-Match with 304, so a quiet menu costs almost nothing to poll.
  router.get('/menu', async (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(await loadMenu(db));
  });

  router.get('/shop', async (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(await loadShop(db, now()));
  });

  router.get('/pickup-slots', async (_req, res) => {
    const at = now();
    const { date, slots } = pickupSlots(at, await loadSlotRules(db, at));
    const body: PickupSlotsResponse = { date, slots: slots.map((slot) => ({ pickupAt: slot.toISOString() })) };
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
