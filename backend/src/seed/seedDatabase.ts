import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '../db/client.js';
import {
  menuGroups,
  menuItemOptionGroups,
  menuItems,
  openingHours,
  optionGroups,
  optionValues,
  shopSettings,
} from '../db/schema.js';
import { MENU_GROUPS, MENU_ITEMS, OPENING_HOURS, OPTION_GROUPS, SHOP } from './data.js';

const excluded = (column: AnyPgColumn) => sql.raw(`excluded."${column.name}"`);
const toCentavos = (pesos: number) => Math.round(pesos * 100);

/**
 * Loads the menu and shop defaults. Safe to run again at any time:
 * - Menu content (names, prices, options, colours) is updated to match `data.ts`.
 * - `is_sold_out` and `is_active` on an existing item are left alone, because staff change them.
 * - Shop settings and opening hours are only created when missing, so edits made in the database survive.
 */
export async function seedDatabase(db: Database) {
  await db.transaction(async (tx) => {
    await tx
      .insert(menuGroups)
      .values([...MENU_GROUPS])
      .onConflictDoUpdate({
        target: menuGroups.id,
        set: {
          name: excluded(menuGroups.name),
          tagline: excluded(menuGroups.tagline),
          morningPosition: excluded(menuGroups.morningPosition),
          afternoonPosition: excluded(menuGroups.afternoonPosition),
        },
      });

    await tx
      .insert(optionGroups)
      .values(OPTION_GROUPS.map((group, position) => ({ id: group.id, label: group.label, kind: group.kind, position })))
      .onConflictDoUpdate({
        target: optionGroups.id,
        set: { label: excluded(optionGroups.label), kind: excluded(optionGroups.kind), position: excluded(optionGroups.position) },
      });

    const valueRows = OPTION_GROUPS.flatMap((group) =>
      group.values.map((value, position) => ({
        groupId: group.id,
        code: value.code,
        label: value.label,
        priceDeltaCentavos: toCentavos(value.priceDeltaPesos),
        position,
      })),
    );
    const savedValues = await tx
      .insert(optionValues)
      .values(valueRows)
      .onConflictDoUpdate({
        target: [optionValues.groupId, optionValues.code],
        set: {
          label: excluded(optionValues.label),
          priceDeltaCentavos: excluded(optionValues.priceDeltaCentavos),
          position: excluded(optionValues.position),
        },
      })
      .returning({ id: optionValues.id, groupId: optionValues.groupId, code: optionValues.code });
    const valueId = new Map(savedValues.map((value) => [`${value.groupId}:${value.code}`, value.id]));

    const positionInGroup = new Map<string, number>();
    const itemRows = MENU_ITEMS.map((item) => {
      const position = positionInGroup.get(item.group) ?? 0;
      positionInGroup.set(item.group, position + 1);
      return {
        id: item.id,
        groupId: item.group,
        name: item.name,
        description: item.description,
        note: item.note ?? null,
        basePriceCentavos: toCentavos(item.pricePesos),
        tone: item.tone,
        stageBackground: item.stageBackground,
        stageInk: item.stageInk,
        art: item.art,
        coffeeRatio: item.coffeeRatio ?? null,
        icedOnly: item.icedOnly ?? false,
        isSoldOut: item.soldOut ?? false,
        position,
      };
    });
    await tx
      .insert(menuItems)
      .values(itemRows)
      .onConflictDoUpdate({
        target: menuItems.id,
        set: {
          groupId: excluded(menuItems.groupId),
          name: excluded(menuItems.name),
          description: excluded(menuItems.description),
          note: excluded(menuItems.note),
          basePriceCentavos: excluded(menuItems.basePriceCentavos),
          tone: excluded(menuItems.tone),
          stageBackground: excluded(menuItems.stageBackground),
          stageInk: excluded(menuItems.stageInk),
          art: excluded(menuItems.art),
          coffeeRatio: excluded(menuItems.coffeeRatio),
          icedOnly: excluded(menuItems.icedOnly),
          position: excluded(menuItems.position),
          updatedAt: sql`now()`,
        },
      });

    const offered = MENU_ITEMS.flatMap((item) =>
      item.options.map((optionGroupId) => {
        const group = OPTION_GROUPS.find((candidate) => candidate.id === optionGroupId)!;
        const defaultCode = item.defaults?.[optionGroupId] ?? group.values[0].code;
        const defaultValueId = valueId.get(`${optionGroupId}:${defaultCode}`);
        if (defaultValueId === undefined) throw new Error(`${item.id}: no ${optionGroupId} value called ${defaultCode}`);
        return { menuItemId: item.id, optionGroupId, defaultValueId };
      }),
    );
    if (offered.length > 0) {
      await tx
        .insert(menuItemOptionGroups)
        .values(offered)
        .onConflictDoUpdate({
          target: [menuItemOptionGroups.menuItemId, menuItemOptionGroups.optionGroupId],
          set: { defaultValueId: excluded(menuItemOptionGroups.defaultValueId) },
        });
    }

    await tx.insert(shopSettings).values({ id: 1, ...SHOP }).onConflictDoNothing();
    await tx.insert(openingHours).values(OPENING_HOURS).onConflictDoNothing();
  });
}
