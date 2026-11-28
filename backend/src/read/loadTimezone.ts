import type { Database } from '../db/client.js';
import { shopSettings } from '../db/schema.js';

/** The shop's time zone, which decides what "today" means for the order board. */
export async function loadShopTimezone(db: Database): Promise<string> {
  const [settings] = await db.select({ timezone: shopSettings.timezone }).from(shopSettings).limit(1);
  if (!settings) throw new Error('shop_settings is empty. Run "npm run db:seed".');
  return settings.timezone;
}
