import type { ArtKind, MenuResponse, ShopResponse } from '@kape/contract';
import { buildCatalog } from '../data/menu';

/** A small copy of what GET /api/v1/menu returns: one item for every kind of drawing and every customization. */

const SIZE = { regular: 1, large: 2 };
const TEMPERATURE = { hot: 3, iced: 4 };
const MILK = { whole: 5, oat: 6, none: 7 };
const EXTRA_SHOT = { none: 8, extra: 9 };

type Offer = { optionGroupId: string; defaultValueId: number };
const size: Offer = { optionGroupId: 'size', defaultValueId: SIZE.regular };
const temperature: Offer = { optionGroupId: 'temperature', defaultValueId: TEMPERATURE.hot };
const milk: Offer = { optionGroupId: 'milk', defaultValueId: MILK.whole };
const noMilk: Offer = { optionGroupId: 'milk', defaultValueId: MILK.none };
const extraShot: Offer = { optionGroupId: 'extra_shot', defaultValueId: EXTRA_SHOT.none };

function item(id: string, groupId: string, basePriceCentavos: number, art: ArtKind, options: Offer[], more: Partial<MenuResponse['items'][number]> = {}) {
  return {
    id,
    groupId,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
    description: `${id} description`,
    note: null,
    basePriceCentavos,
    tone: '#7a3b2a',
    stageBackground: '#e9b792',
    stageInk: '#33110a',
    art,
    coffeeRatio: groupId === 'bakery' ? null : 0.5,
    icedOnly: false,
    isSoldOut: false,
    options,
    ...more,
  };
}

export const MENU_FIXTURE: MenuResponse = {
  groups: [
    { id: 'espresso', name: 'Espresso bar', tagline: 'Pulled early.', morningPosition: 0, afternoonPosition: 1 },
    { id: 'slow', name: 'Slow bar', tagline: 'By hand.', morningPosition: 1, afternoonPosition: 2 },
    { id: 'cold', name: 'Cold bar', tagline: 'For Naga after eleven.', morningPosition: 2, afternoonPosition: 0 },
    { id: 'bakery', name: 'Bakery', tagline: 'Baked next door.', morningPosition: 3, afternoonPosition: 3 },
  ],
  optionGroups: [
    {
      id: 'size',
      label: 'Size',
      kind: 'single',
      values: [
        { id: SIZE.regular, code: 'regular', label: 'Regular', priceDeltaCentavos: 0 },
        { id: SIZE.large, code: 'large', label: 'Large', priceDeltaCentavos: 3000 },
      ],
    },
    {
      id: 'temperature',
      label: 'Temperature',
      kind: 'single',
      values: [
        { id: TEMPERATURE.hot, code: 'hot', label: 'Hot', priceDeltaCentavos: 0 },
        { id: TEMPERATURE.iced, code: 'iced', label: 'Iced', priceDeltaCentavos: 0 },
      ],
    },
    {
      id: 'milk',
      label: 'Milk',
      kind: 'single',
      values: [
        { id: MILK.whole, code: 'whole', label: 'Whole milk', priceDeltaCentavos: 0 },
        { id: MILK.oat, code: 'oat', label: 'Oat milk', priceDeltaCentavos: 4000 },
        { id: MILK.none, code: 'none', label: 'No milk', priceDeltaCentavos: 0 },
      ],
    },
    {
      id: 'extra_shot',
      label: 'Extra shot',
      kind: 'toggle',
      values: [
        { id: EXTRA_SHOT.none, code: 'none', label: 'No extra shot', priceDeltaCentavos: 0 },
        { id: EXTRA_SHOT.extra, code: 'extra', label: 'Extra shot', priceDeltaCentavos: 5000 },
      ],
    },
  ],
  items: [
    item('alas-singko', 'espresso', 12000, 'demitasse', [extraShot], { coffeeRatio: 1 }),
    item('flat-white', 'espresso', 16000, 'small-cup', [temperature, milk, extraShot], { coffeeRatio: 0.45 }),
    item('latte', 'espresso', 17000, 'cup', [size, temperature, milk, extraShot], { coffeeRatio: 0.28 }),
    item('spanish-latte', 'espresso', 19000, 'glass', [size, temperature, milk, extraShot], { note: 'Contains condensed milk even with oat.' }),
    item('benguet-pour-over', 'slow', 18000, 'pour-over', [temperature]),
    item('barako-press', 'slow', 15000, 'press', [size]),
    item('batch-brew', 'slow', 12000, 'mug', [size, temperature]),
    item('cold-brew', 'cold', 16000, 'glass', [size, noMilk], { icedOnly: true }),
    item('coconut-cold-brew', 'cold', 20000, 'glass', [], { icedOnly: true, isSoldOut: true }),
    item('pandesal', 'bakery', 9000, 'pastry', []),
    item('ube-pandesal', 'bakery', 11000, 'pastry', [], { isSoldOut: true }),
  ],
};

export const catalog = buildCatalog(MENU_FIXTURE);

export const SHOP_FIXTURE: ShopResponse = {
  name: 'Kapé Alas-Singko',
  address: 'Magsaysay Avenue, Naga City, Camarines Sur',
  timezone: 'Asia/Manila',
  acceptingOrders: true,
  slotMinutes: 15,
  minLeadMinutes: 10,
  openingHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '05:00', closesAt: '21:00', isClosed: false })),
  closures: [],
};
