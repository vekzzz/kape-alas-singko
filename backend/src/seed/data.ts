import type { ArtKind } from '@kape/contract';

/**
 * The menu as it was in frontend/src/data/menu.ts, STAGE_COLORS and pickVessel, now as data for the database.
 * Prices are whole pesos here and become centavos when seeded.
 */

export const MENU_GROUPS = [
  { id: 'espresso', name: 'Espresso bar', tagline: 'Pulled on the dial we set at 4:45 every morning.', morningPosition: 0, afternoonPosition: 1 },
  { id: 'slow', name: 'Slow bar', tagline: 'Brewed by hand, one cup at a time. Allow five minutes.', morningPosition: 1, afternoonPosition: 2 },
  { id: 'cold', name: 'Cold bar', tagline: 'For Naga after eleven.', morningPosition: 2, afternoonPosition: 0 },
  { id: 'bakery', name: 'Bakery', tagline: 'Baked next door and carried over before we open.', morningPosition: 3, afternoonPosition: 3 },
] as const;

export const OPTION_GROUPS = [
  {
    id: 'size',
    label: 'Size',
    kind: 'single',
    values: [
      { code: 'regular', label: 'Regular', priceDeltaPesos: 0 },
      { code: 'large', label: 'Large', priceDeltaPesos: 30 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    kind: 'single',
    values: [
      { code: 'hot', label: 'Hot', priceDeltaPesos: 0 },
      { code: 'iced', label: 'Iced', priceDeltaPesos: 0 },
    ],
  },
  {
    id: 'milk',
    label: 'Milk',
    kind: 'single',
    values: [
      { code: 'whole', label: 'Whole milk', priceDeltaPesos: 0 },
      { code: 'oat', label: 'Oat milk', priceDeltaPesos: 40 },
      { code: 'none', label: 'No milk', priceDeltaPesos: 0 },
    ],
  },
  {
    id: 'extra_shot',
    label: 'Extra shot',
    kind: 'toggle',
    values: [
      { code: 'none', label: 'No extra shot', priceDeltaPesos: 0 },
      { code: 'extra', label: 'Extra shot', priceDeltaPesos: 50 },
    ],
  },
] as const;

export type OptionGroupId = (typeof OPTION_GROUPS)[number]['id'];

type SeedItem = {
  id: string;
  group: (typeof MENU_GROUPS)[number]['id'];
  name: string;
  description: string;
  note?: string;
  pricePesos: number;
  tone: string;
  stageBackground: string;
  stageInk: string;
  art: ArtKind;
  coffeeRatio?: number;
  icedOnly?: boolean;
  soldOut?: boolean;
  /** Which customizations the item offers. A group listed here uses that group's first value unless `defaults` says otherwise. */
  options: OptionGroupId[];
  /** Default value code per option group, for the ones that are not the group's first value. */
  defaults?: Partial<Record<OptionGroupId, string>>;
};

export const MENU_ITEMS: SeedItem[] = [
  {
    id: 'alas-singko',
    group: 'espresso',
    name: 'Alas-Singko',
    description: 'The house double espresso. Benguet arabica, dark sugar, a little smoke.',
    pricePesos: 120,
    tone: '#1c0508',
    stageBackground: '#ff99d3',
    stageInk: '#3d0012',
    art: 'demitasse',
    coffeeRatio: 1,
    options: ['extra_shot'],
  },
  {
    id: 'americano',
    group: 'espresso',
    name: 'Americano',
    description: 'A double shot let down with hot water. Long, clean, black.',
    pricePesos: 130,
    tone: '#24080b',
    stageBackground: '#1f0a0d',
    stageInk: '#ffb9df',
    art: 'cup',
    coffeeRatio: 1,
    options: ['size', 'temperature', 'extra_shot'],
  },
  {
    id: 'flat-white',
    group: 'espresso',
    name: 'Flat white',
    description: 'Two shots under a thin layer of steamed milk. Small and strong.',
    pricePesos: 160,
    tone: '#c98b6b',
    stageBackground: '#e9b792',
    stageInk: '#33110a',
    art: 'small-cup',
    coffeeRatio: 0.45,
    options: ['temperature', 'milk', 'extra_shot'],
  },
  {
    id: 'latte',
    group: 'espresso',
    name: 'Latte',
    description: 'One long pour of milk over a double shot. The gentle one.',
    pricePesos: 170,
    tone: '#dba785',
    stageBackground: '#dca845',
    stageInk: '#2b1400',
    art: 'cup',
    coffeeRatio: 0.28,
    options: ['size', 'temperature', 'milk', 'extra_shot'],
  },
  {
    id: 'spanish-latte',
    group: 'espresso',
    name: 'Spanish latte',
    description: 'Latte sweetened with condensed milk, the way Naga likes it.',
    note: 'Contains condensed milk even with oat.',
    pricePesos: 190,
    tone: '#e3b592',
    stageBackground: '#f6cfa6',
    stageInk: '#3a1608',
    art: 'glass',
    coffeeRatio: 0.28,
    options: ['size', 'temperature', 'milk', 'extra_shot'],
  },
  {
    id: 'tablea-mocha',
    group: 'espresso',
    name: 'Tablea mocha',
    description: 'Espresso melted into Davao tablea chocolate, topped with milk.',
    pricePesos: 200,
    tone: '#7a3b2a',
    stageBackground: '#5a2418',
    stageInk: '#ffd9b8',
    art: 'cup',
    coffeeRatio: 0.4,
    options: ['size', 'temperature', 'milk', 'extra_shot'],
  },

  {
    id: 'benguet-pour-over',
    group: 'slow',
    name: 'Benguet pour-over',
    description: 'Washed arabica from Atok. Brown sugar, orange peel, soft finish.',
    pricePesos: 180,
    tone: '#3a0f0c',
    stageBackground: '#802e21',
    stageInk: '#fff1e3',
    art: 'pour-over',
    coffeeRatio: 1,
    options: ['temperature'],
  },
  {
    id: 'sagada-pour-over',
    group: 'slow',
    name: 'Sagada pour-over',
    description: 'Honey-processed, grown at 1,500 metres. Ripe plum and cacao.',
    pricePesos: 190,
    tone: '#42120d',
    stageBackground: '#641c44',
    stageInk: '#ffc9e6',
    art: 'cup',
    coffeeRatio: 1,
    options: ['temperature'],
  },
  {
    id: 'barako-press',
    group: 'slow',
    name: 'Barako press',
    description: 'Batangas liberica in a French press. Heavy, woody, unapologetic.',
    pricePesos: 150,
    tone: '#160405',
    stageBackground: '#1d1210',
    stageInk: '#f3cc7c',
    art: 'press',
    coffeeRatio: 1,
    options: ['size'],
  },
  {
    id: 'batch-brew',
    group: 'slow',
    name: 'Batch brew',
    description: 'Today’s filter coffee, ready when you are. Ask which bean.',
    pricePesos: 120,
    tone: '#2e0b0a',
    stageBackground: '#664220',
    stageInk: '#fff3df',
    art: 'mug',
    coffeeRatio: 1,
    options: ['size', 'temperature'],
  },

  {
    id: 'cold-brew',
    group: 'cold',
    name: 'Cold brew',
    description: 'Steeped eighteen hours, served over a single block of ice.',
    pricePesos: 160,
    tone: '#1a0507',
    stageBackground: '#113a4a',
    stageInk: '#c6ecff',
    art: 'glass',
    coffeeRatio: 1,
    icedOnly: true,
    options: ['size', 'milk'],
    defaults: { milk: 'none' },
  },
  {
    id: 'calamansi-tonic',
    group: 'cold',
    name: 'Calamansi tonic',
    description: 'A double shot over tonic water and fresh calamansi. Sharp and bright.',
    pricePesos: 190,
    tone: '#c9772e',
    stageBackground: '#f2b632',
    stageInk: '#2b1400',
    art: 'glass',
    coffeeRatio: 0.3,
    icedOnly: true,
    options: ['extra_shot'],
  },
  {
    id: 'iced-tablea',
    group: 'cold',
    name: 'Iced tablea',
    description: 'Cold chocolate from Davao tablea, no coffee. Good for the young.',
    note: 'No caffeine.',
    pricePesos: 180,
    tone: '#6b3124',
    stageBackground: '#693324',
    stageInk: '#ffe2cb',
    art: 'glass',
    coffeeRatio: 0.5,
    icedOnly: true,
    options: ['size', 'milk'],
  },
  {
    id: 'coconut-cold-brew',
    group: 'cold',
    name: 'Coconut cold brew',
    description: 'Cold brew over fresh buko juice. Made in one small batch a day.',
    pricePesos: 200,
    tone: '#4a2018',
    stageBackground: '#bfe3d0',
    stageInk: '#0f3326',
    art: 'glass',
    coffeeRatio: 1,
    icedOnly: true,
    soldOut: true,
    options: [],
  },

  {
    id: 'pandesal',
    group: 'bakery',
    name: 'Pan de sal',
    description: 'Two warm rolls with white carabao cheese from Laguna.',
    pricePesos: 90,
    tone: '#e0a05c',
    stageBackground: '#f0c878',
    stageInk: '#3d1a00',
    art: 'pastry',
    options: [],
  },
  {
    id: 'ensaymada',
    group: 'bakery',
    name: 'Ensaymada',
    description: 'Soft brioche coil, butter, sugar and grated queso de bola.',
    pricePesos: 140,
    tone: '#f0c878',
    stageBackground: '#ffd66b',
    stageInk: '#3d1a00',
    art: 'pastry',
    options: [],
  },
  {
    id: 'banana-loaf',
    group: 'bakery',
    name: 'Banana loaf',
    description: 'A thick slice made with lakatan bananas and muscovado.',
    note: 'Contains walnuts.',
    pricePesos: 120,
    tone: '#b06a3a',
    stageBackground: '#6e3f1f',
    stageInk: '#fff3e0',
    art: 'pastry',
    options: [],
  },
  {
    id: 'ube-pandesal',
    group: 'bakery',
    name: 'Ube cheese pandesal',
    description: 'Purple yam rolls with a melted cheese centre.',
    pricePesos: 110,
    tone: '#8a4a7a',
    stageBackground: '#633557',
    stageInk: '#ffe3f5',
    art: 'pastry',
    soldOut: true,
    options: [],
  },
];

export const SHOP = {
  name: 'Kapé Alas-Singko',
  address: 'Magsaysay Avenue, Naga City, Camarines Sur',
  timezone: 'Asia/Manila',
  orderPrefix: 'A5-',
  slotMinutes: 15,
  minLeadMinutes: 10,
} as const;

/** Every day, 5:00 AM to 9:00 PM. Weekday 0 is Sunday. */
export const OPENING_HOURS = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opensAt: '05:00',
  closesAt: '21:00',
  isClosed: false,
}));
