import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { menuGroups, menuItemOptionGroups, menuItems, openingHours, optionValues, shopSettings } from '../src/db/schema.js';
import { MENU_ITEMS } from '../src/seed/data.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { connectTestDatabase, emptyAllTables } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

beforeEach(() => emptyAllTables(pool));
afterAll(() => pool.end());

async function optionsOf(itemId: string) {
  return db
    .select({ group: menuItemOptionGroups.optionGroupId, defaultCode: optionValues.code })
    .from(menuItemOptionGroups)
    .leftJoin(optionValues, eq(optionValues.id, menuItemOptionGroups.defaultValueId))
    .where(eq(menuItemOptionGroups.menuItemId, itemId));
}

describe('seedDatabase', () => {
  it('loads every group, item and the shop defaults', async () => {
    await seedDatabase(db);

    expect(await db.select().from(menuGroups)).toHaveLength(4);
    expect(await db.select().from(menuItems)).toHaveLength(MENU_ITEMS.length);
    expect(await db.select().from(openingHours)).toHaveLength(7);
    const [shop] = await db.select().from(shopSettings);
    expect(shop).toMatchObject({ id: 1, timezone: 'Asia/Manila', orderPrefix: 'A5-', slotMinutes: 15, minLeadMinutes: 10, acceptingOrders: true });
  });

  it('stores prices in centavos, matching the old pricing rules', async () => {
    await seedDatabase(db);

    const [latte] = await db.select().from(menuItems).where(eq(menuItems.id, 'latte'));
    expect(latte?.basePriceCentavos).toBe(17000);

    const deltas = await db.select({ group: optionValues.groupId, code: optionValues.code, delta: optionValues.priceDeltaCentavos }).from(optionValues);
    const delta = (group: string, code: string) => deltas.find((v) => v.group === group && v.code === code)?.delta;
    expect(delta('size', 'large')).toBe(3000);
    expect(delta('milk', 'oat')).toBe(4000);
    expect(delta('extra_shot', 'extra')).toBe(5000);
    expect(delta('size', 'regular')).toBe(0);
  });

  it('reproduces the old default options', async () => {
    await seedDatabase(db);

    expect(await optionsOf('latte')).toEqual(
      expect.arrayContaining([
        { group: 'size', defaultCode: 'regular' },
        { group: 'temperature', defaultCode: 'hot' },
        { group: 'milk', defaultCode: 'whole' },
        { group: 'extra_shot', defaultCode: 'none' },
      ]),
    );
    // Cold brew was the one drink that did not default to milk.
    expect(await optionsOf('cold-brew')).toEqual(expect.arrayContaining([{ group: 'milk', defaultCode: 'none' }]));
    // Iced-only drinks skip the temperature group; bakery is not customizable.
    expect((await optionsOf('cold-brew')).map((o) => o.group)).not.toContain('temperature');
    expect(await optionsOf('pandesal')).toEqual([]);
  });

  it('keeps the sold-out items from the old menu', async () => {
    await seedDatabase(db);

    const soldOut = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.isSoldOut, true));
    expect(soldOut.map((item) => item.id).sort()).toEqual(['coconut-cold-brew', 'ube-pandesal']);
  });

  it('is safe to run twice', async () => {
    await seedDatabase(db);
    await seedDatabase(db);

    expect(await db.select().from(menuItems)).toHaveLength(MENU_ITEMS.length);
    expect(await db.select().from(optionValues)).toHaveLength(9);
    expect(await db.select().from(menuItemOptionGroups)).toHaveLength(MENU_ITEMS.reduce((sum, item) => sum + item.options.length, 0));
  });

  it('does not undo what staff changed', async () => {
    await seedDatabase(db);
    await db.update(menuItems).set({ isSoldOut: true }).where(eq(menuItems.id, 'latte'));
    await db.update(menuItems).set({ isSoldOut: false }).where(eq(menuItems.id, 'ube-pandesal'));
    await db.update(shopSettings).set({ acceptingOrders: false });

    await seedDatabase(db);

    const [latte] = await db.select().from(menuItems).where(eq(menuItems.id, 'latte'));
    const [ube] = await db.select().from(menuItems).where(and(eq(menuItems.id, 'ube-pandesal')));
    const [shop] = await db.select().from(shopSettings);
    expect(latte?.isSoldOut).toBe(true);
    expect(ube?.isSoldOut).toBe(false);
    expect(shop?.acceptingOrders).toBe(false);
  });

  it('updates menu content when the seed data changes', async () => {
    await seedDatabase(db);
    await db.update(menuItems).set({ basePriceCentavos: 99900, name: 'Old name' }).where(eq(menuItems.id, 'latte'));

    await seedDatabase(db);

    const [latte] = await db.select().from(menuItems).where(eq(menuItems.id, 'latte'));
    expect(latte).toMatchObject({ basePriceCentavos: 17000, name: 'Latte' });
  });
});
