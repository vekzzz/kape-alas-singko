import type { MenuItem } from '../../data/menu';

export const MILK_COLORS = { whole: '#f6ede2', oat: '#e8cfa8', none: 'transparent' } as const;
export const FOAM_COLOR = '#fbf3ea';
export const LAYER_SPRING = { type: 'spring', stiffness: 140, damping: 20 } as const;

export type Vessel = 'demitasse' | 'cup' | 'small-cup' | 'mug' | 'glass' | 'press' | 'pour-over' | 'pastry';

export function pickVessel(item: MenuItem, iced: boolean): Vessel {
  if (item.group === 'bakery') return 'pastry';
  if (iced || item.id === 'spanish-latte') return 'glass';
  if (item.id === 'barako-press') return 'press';
  if (item.id === 'benguet-pour-over') return 'pour-over';
  if (item.id === 'alas-singko') return 'demitasse';
  if (item.id === 'batch-brew') return 'mug';
  if (item.id === 'flat-white') return 'small-cup';
  return 'cup';
}

export function mixColors(from: string, to: string, amount: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) => Math.round(channel(from, i) * (1 - amount) + channel(to, i) * amount));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function scatter(count: number, seed: number): [number, number, number][] {
  let state = seed;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => [next(), next(), next()]);
}

export function seedFromId(id: string): number {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0) * 31, 7);
  return hash % 2147483646 || 1;
}
