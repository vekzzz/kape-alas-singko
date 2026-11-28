import type { ArtKind, MenuResponse } from '@kape/contract';
import type { DrinkOptions } from '../lib/pricing';

/**
 * The menu as the screens use it. It is built from the API reply (GET /api/v1/menu) by `buildCatalog`,
 * so names, prices, colours and customizations all come from the database.
 * Prices here are whole pesos; the API sends centavos.
 */

export type MenuGroupId = string;

export type MenuGroup = {
  id: MenuGroupId;
  name: string;
  tagline: string;
  morningPosition: number;
  afternoonPosition: number;
};

/** What each customization adds to the price, in pesos. Zero when an item does not offer it. */
export type Extras = { large: number; oat: number; extraShot: number };

export type MenuItem = {
  id: string;
  group: MenuGroupId;
  name: string;
  description: string;
  note?: string;
  price: number;
  tone: string;
  stageBackground: string;
  stageInk: string;
  art: ArtKind;
  soldOut?: boolean;
  hasSizes?: boolean;
  hasTemperatures?: boolean;
  hasMilk?: boolean;
  hasExtraShot?: boolean;
  icedOnly?: boolean;
  coffeeRatio?: number;
  /** The choices a customer gets before changing anything. */
  defaults: DrinkOptions;
  extras: Extras;
};

export type Catalog = {
  groups: MenuGroup[];
  items: MenuItem[];
  findItem: (id: string) => MenuItem | undefined;
  getItem: (id: string) => MenuItem;
  getGroup: (id: MenuGroupId) => MenuGroup;
};

const centavosToPesos = (centavos: number) => centavos / 100;

export function buildCatalog(menu: MenuResponse): Catalog {
  const values = new Map(menu.optionGroups.flatMap((group) => group.values.map((value) => [value.id, { group: group.id, ...value }] as const)));
  const deltaPesos = (group: string, code: string) => {
    const value = menu.optionGroups.find((g) => g.id === group)?.values.find((v) => v.code === code);
    return value ? centavosToPesos(value.priceDeltaCentavos) : 0;
  };
  const extras: Extras = { large: deltaPesos('size', 'large'), oat: deltaPesos('milk', 'oat'), extraShot: deltaPesos('extra_shot', 'extra') };

  const items = menu.items.map((item): MenuItem => {
    const offered = new Set(item.options.map((option) => option.optionGroupId));
    const defaultCode = (group: string) => {
      const option = item.options.find((o) => o.optionGroupId === group);
      return option?.defaultValueId != null ? values.get(option.defaultValueId)?.code : undefined;
    };
    const milk = defaultCode('milk');

    return {
      id: item.id,
      group: item.groupId,
      name: item.name,
      description: item.description,
      note: item.note ?? undefined,
      price: centavosToPesos(item.basePriceCentavos),
      tone: item.tone,
      stageBackground: item.stageBackground,
      stageInk: item.stageInk,
      art: item.art,
      soldOut: item.isSoldOut || undefined,
      hasSizes: offered.has('size') || undefined,
      hasTemperatures: offered.has('temperature') || undefined,
      hasMilk: offered.has('milk') || undefined,
      hasExtraShot: offered.has('extra_shot') || undefined,
      icedOnly: item.icedOnly || undefined,
      coffeeRatio: item.coffeeRatio ?? undefined,
      defaults: {
        size: defaultCode('size') === 'large' ? 'large' : 'regular',
        temperature: defaultCode('temperature') === 'iced' || (!offered.has('temperature') && item.icedOnly) ? 'iced' : 'hot',
        milk: milk === 'whole' || milk === 'oat' ? milk : 'none',
        extraShot: defaultCode('extra_shot') === 'extra',
      },
      extras,
    };
  });

  const byId = new Map(items.map((item) => [item.id, item]));
  const groupsById = new Map(menu.groups.map((group) => [group.id, group]));

  return {
    groups: menu.groups,
    items,
    findItem: (id) => byId.get(id),
    getItem: (id) => {
      const item = byId.get(id);
      if (!item) throw new Error(`Unknown menu item: ${id}`);
      return item;
    },
    getGroup: (id) => {
      const group = groupsById.get(id);
      if (!group) throw new Error(`Unknown menu group: ${id}`);
      return group;
    },
  };
}

export function isCustomizable(item: MenuItem): boolean {
  return Boolean(item.hasSizes || item.hasTemperatures || item.hasMilk || item.hasExtraShot);
}

/** Groups in the order the bar wants them at this time of day: cold bar first from 11 AM to 6 PM. */
export function menuGroupOrder(catalog: Catalog, manilaMinutes: number): MenuGroupId[] {
  const afternoon = manilaMinutes >= 11 * 60 && manilaMinutes < 18 * 60;
  const position = (group: MenuGroup) => (afternoon ? group.afternoonPosition : group.morningPosition);
  return [...catalog.groups].sort((a, b) => position(a) - position(b)).map((group) => group.id);
}

export function sortedMenu(catalog: Catalog, manilaMinutes: number): MenuItem[] {
  return menuGroupOrder(catalog, manilaMinutes).flatMap((group) => catalog.items.filter((item) => item.group === group));
}
