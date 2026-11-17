export type MenuGroupId = 'espresso' | 'slow' | 'cold' | 'bakery';

export type MenuGroup = {
  id: MenuGroupId;
  name: string;
  tagline: string;
};

export type MenuItem = {
  id: string;
  group: MenuGroupId;
  name: string;
  description: string;
  note?: string;
  price: number;
  /** Main colour of the drink or pastry, used by the drawings. */
  tone: string;
  soldOut?: boolean;
  hasSizes?: boolean;
  hasTemperatures?: boolean;
  hasMilk?: boolean;
  hasExtraShot?: boolean;
  icedOnly?: boolean;
  /** Share of the drink that is coffee before any milk goes in, from 0 to 1. */
  coffeeRatio?: number;
};

export const MENU_GROUPS: MenuGroup[] = [
  { id: 'espresso', name: 'Espresso bar', tagline: 'Pulled on the dial we set at 4:45 every morning.' },
  { id: 'slow', name: 'Slow bar', tagline: 'Brewed by hand, one cup at a time. Allow five minutes.' },
  { id: 'cold', name: 'Cold bar', tagline: 'For Naga after eleven.' },
  { id: 'bakery', name: 'Bakery', tagline: 'Baked next door and carried over before we open.' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'alas-singko',
    group: 'espresso',
    name: 'Alas-Singko',
    description: 'The house double espresso. Benguet arabica, dark sugar, a little smoke.',
    price: 120,
    tone: '#1c0508',
    hasExtraShot: true,
    coffeeRatio: 1,
  },
  {
    id: 'americano',
    group: 'espresso',
    name: 'Americano',
    description: 'A double shot let down with hot water. Long, clean, black.',
    price: 130,
    tone: '#24080b',
    hasSizes: true,
    hasTemperatures: true,
    hasExtraShot: true,
    coffeeRatio: 1,
  },
  {
    id: 'flat-white',
    group: 'espresso',
    name: 'Flat white',
    description: 'Two shots under a thin layer of steamed milk. Small and strong.',
    price: 160,
    tone: '#c98b6b',
    hasTemperatures: true,
    hasMilk: true,
    hasExtraShot: true,
    coffeeRatio: 0.45,
  },
  {
    id: 'latte',
    group: 'espresso',
    name: 'Latte',
    description: 'One long pour of milk over a double shot. The gentle one.',
    price: 170,
    tone: '#dba785',
    hasSizes: true,
    hasTemperatures: true,
    hasMilk: true,
    hasExtraShot: true,
    coffeeRatio: 0.28,
  },
  {
    id: 'spanish-latte',
    group: 'espresso',
    name: 'Spanish latte',
    description: 'Latte sweetened with condensed milk, the way Naga likes it.',
    note: 'Contains condensed milk even with oat.',
    price: 190,
    tone: '#e3b592',
    hasSizes: true,
    hasTemperatures: true,
    hasMilk: true,
    hasExtraShot: true,
    coffeeRatio: 0.28,
  },
  {
    id: 'tablea-mocha',
    group: 'espresso',
    name: 'Tablea mocha',
    description: 'Espresso melted into Davao tablea chocolate, topped with milk.',
    price: 200,
    tone: '#7a3b2a',
    hasSizes: true,
    hasTemperatures: true,
    hasMilk: true,
    hasExtraShot: true,
    coffeeRatio: 0.4,
  },

  {
    id: 'benguet-pour-over',
    group: 'slow',
    name: 'Benguet pour-over',
    description: 'Washed arabica from Atok. Brown sugar, orange peel, soft finish.',
    price: 180,
    tone: '#3a0f0c',
    hasTemperatures: true,
    coffeeRatio: 1,
  },
  {
    id: 'sagada-pour-over',
    group: 'slow',
    name: 'Sagada pour-over',
    description: 'Honey-processed, grown at 1,500 metres. Ripe plum and cacao.',
    price: 190,
    tone: '#42120d',
    hasTemperatures: true,
    coffeeRatio: 1,
  },
  {
    id: 'barako-press',
    group: 'slow',
    name: 'Barako press',
    description: 'Batangas liberica in a French press. Heavy, woody, unapologetic.',
    price: 150,
    tone: '#160405',
    hasSizes: true,
    coffeeRatio: 1,
  },
  {
    id: 'batch-brew',
    group: 'slow',
    name: 'Batch brew',
    description: 'Today’s filter coffee, ready when you are. Ask which bean.',
    price: 120,
    tone: '#2e0b0a',
    hasSizes: true,
    hasTemperatures: true,
    coffeeRatio: 1,
  },

  {
    id: 'cold-brew',
    group: 'cold',
    name: 'Cold brew',
    description: 'Steeped eighteen hours, served over a single block of ice.',
    price: 160,
    tone: '#1a0507',
    hasSizes: true,
    hasMilk: true,
    icedOnly: true,
    coffeeRatio: 1,
  },
  {
    id: 'calamansi-tonic',
    group: 'cold',
    name: 'Calamansi tonic',
    description: 'A double shot over tonic water and fresh calamansi. Sharp and bright.',
    price: 190,
    tone: '#c9772e',
    hasExtraShot: true,
    icedOnly: true,
    coffeeRatio: 0.3,
  },
  {
    id: 'iced-tablea',
    group: 'cold',
    name: 'Iced tablea',
    description: 'Cold chocolate from Davao tablea, no coffee. Good for the young.',
    note: 'No caffeine.',
    price: 180,
    tone: '#6b3124',
    hasSizes: true,
    hasMilk: true,
    icedOnly: true,
    coffeeRatio: 0.5,
  },
  {
    id: 'coconut-cold-brew',
    group: 'cold',
    name: 'Coconut cold brew',
    description: 'Cold brew over fresh buko juice. Made in one small batch a day.',
    price: 200,
    tone: '#4a2018',
    icedOnly: true,
    soldOut: true,
    coffeeRatio: 1,
  },

  {
    id: 'pandesal',
    group: 'bakery',
    name: 'Pan de sal',
    description: 'Two warm rolls with white carabao cheese from Laguna.',
    price: 90,
    tone: '#e0a05c',
  },
  {
    id: 'ensaymada',
    group: 'bakery',
    name: 'Ensaymada',
    description: 'Soft brioche coil, butter, sugar and grated queso de bola.',
    price: 140,
    tone: '#f0c878',
  },
  {
    id: 'banana-loaf',
    group: 'bakery',
    name: 'Banana loaf',
    description: 'A thick slice made with lakatan bananas and muscovado.',
    note: 'Contains walnuts.',
    price: 120,
    tone: '#b06a3a',
  },
  {
    id: 'ube-pandesal',
    group: 'bakery',
    name: 'Ube cheese pandesal',
    description: 'Purple yam rolls with a melted cheese centre.',
    price: 110,
    tone: '#8a4a7a',
    soldOut: true,
  },
];

const itemsById = new Map(MENU_ITEMS.map((item) => [item.id, item]));

export function findMenuItem(id: string): MenuItem | undefined {
  return itemsById.get(id);
}

export function getMenuItem(id: string): MenuItem {
  const item = itemsById.get(id);
  if (!item) throw new Error(`Unknown menu item: ${id}`);
  return item;
}

export function getMenuGroup(id: MenuGroupId): MenuGroup {
  const group = MENU_GROUPS.find((g) => g.id === id);
  if (!group) throw new Error(`Unknown menu group: ${id}`);
  return group;
}

export function isCustomizable(item: MenuItem): boolean {
  return Boolean(item.hasSizes || item.hasTemperatures || item.hasMilk || item.hasExtraShot);
}

/** The cold bar moves to the top of the menu from 11 AM to 6 PM. */
export function menuGroupOrder(manilaMinutes: number): MenuGroupId[] {
  const afternoon = manilaMinutes >= 11 * 60 && manilaMinutes < 18 * 60;
  return afternoon ? ['cold', 'espresso', 'slow', 'bakery'] : ['espresso', 'slow', 'cold', 'bakery'];
}

export function sortedMenu(manilaMinutes: number): MenuItem[] {
  return menuGroupOrder(manilaMinutes).flatMap((group) => MENU_ITEMS.filter((item) => item.group === group));
}
