import type { MenuResponse } from '@kape/contract';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { menuGroups, menuItemOptionGroups, menuItems, optionGroups, optionValues } from '../db/schema.js';

/** The whole customer-facing menu, nested, in display order. Hidden (inactive) items are left out. */
export async function loadMenu(db: Database): Promise<MenuResponse> {
  const [groups, groupRows, valueRows, itemRows, linkRows] = await Promise.all([
    db.select().from(menuGroups).orderBy(asc(menuGroups.morningPosition)),
    db.select().from(optionGroups).orderBy(asc(optionGroups.position)),
    db.select().from(optionValues).orderBy(asc(optionValues.position)),
    db.select().from(menuItems).where(eq(menuItems.isActive, true)).orderBy(asc(menuItems.groupId), asc(menuItems.position)),
    db.select().from(menuItemOptionGroups),
  ]);

  const valuesByGroup = Map.groupBy(valueRows, (value) => value.groupId);
  const linksByItem = Map.groupBy(linkRows, (link) => link.menuItemId);
  const optionOrder = new Map(groupRows.map((group, index) => [group.id, index]));

  return {
    groups: groups.map(({ id, name, tagline, morningPosition, afternoonPosition }) => ({ id, name, tagline, morningPosition, afternoonPosition })),
    optionGroups: groupRows.map((group) => ({
      id: group.id,
      label: group.label,
      kind: group.kind as MenuResponse['optionGroups'][number]['kind'],
      values: (valuesByGroup.get(group.id) ?? []).map(({ id, code, label, priceDeltaCentavos }) => ({ id, code, label, priceDeltaCentavos })),
    })),
    items: itemRows.map((item) => ({
      id: item.id,
      groupId: item.groupId,
      name: item.name,
      description: item.description,
      note: item.note,
      basePriceCentavos: item.basePriceCentavos,
      tone: item.tone,
      stageBackground: item.stageBackground,
      stageInk: item.stageInk,
      art: item.art as MenuResponse['items'][number]['art'],
      coffeeRatio: item.coffeeRatio,
      icedOnly: item.icedOnly,
      isSoldOut: item.isSoldOut,
      options: (linksByItem.get(item.id) ?? [])
        .map((link) => ({ optionGroupId: link.optionGroupId, defaultValueId: link.defaultValueId }))
        .sort((a, b) => (optionOrder.get(a.optionGroupId) ?? 0) - (optionOrder.get(b.optionGroupId) ?? 0)),
    })),
  };
}
