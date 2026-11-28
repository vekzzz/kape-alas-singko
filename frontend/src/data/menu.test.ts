import { describe, expect, it } from 'vitest';
import { catalog } from '../test/menuFixture';
import { isCustomizable, menuGroupOrder, sortedMenu } from './menu';

describe('buildCatalog', () => {
  it('turns centavos into pesos', () => {
    expect(catalog.getItem('latte').price).toBe(170);
    expect(catalog.getItem('latte').extras).toEqual({ large: 30, oat: 40, extraShot: 50 });
  });

  it('works out which customizations an item offers', () => {
    expect(catalog.getItem('latte')).toMatchObject({ hasSizes: true, hasTemperatures: true, hasMilk: true, hasExtraShot: true });
    expect(catalog.getItem('alas-singko')).toMatchObject({ hasExtraShot: true, hasSizes: undefined, hasMilk: undefined });
    expect(isCustomizable(catalog.getItem('latte'))).toBe(true);
    expect(isCustomizable(catalog.getItem('pandesal'))).toBe(false);
  });

  it('reads the default choices from the menu', () => {
    expect(catalog.getItem('latte').defaults).toEqual({ size: 'regular', temperature: 'hot', milk: 'whole', extraShot: false });
    // Cold brew was always served without milk, and iced drinks have no temperature to choose.
    expect(catalog.getItem('cold-brew').defaults).toEqual({ size: 'regular', temperature: 'iced', milk: 'none', extraShot: false });
    expect(catalog.getItem('pandesal').defaults).toEqual({ size: 'regular', temperature: 'hot', milk: 'none', extraShot: false });
  });

  it('carries the colours, art and sold-out flag', () => {
    expect(catalog.getItem('barako-press')).toMatchObject({ art: 'press', stageBackground: '#e9b792', stageInk: '#33110a' });
    expect(catalog.getItem('ube-pandesal').soldOut).toBe(true);
    expect(catalog.getItem('latte').soldOut).toBeUndefined();
  });

  it('looks things up, and says when they are missing', () => {
    expect(catalog.findItem('nope')).toBeUndefined();
    expect(() => catalog.getItem('nope')).toThrow('Unknown menu item');
    expect(catalog.getGroup('cold').name).toBe('Cold bar');
    expect(() => catalog.getGroup('nope')).toThrow('Unknown menu group');
  });
});

describe('menu order by time of day', () => {
  it('leads with espresso in the morning and the cold bar from 11 AM to 6 PM', () => {
    expect(menuGroupOrder(catalog, 9 * 60)).toEqual(['espresso', 'slow', 'cold', 'bakery']);
    expect(menuGroupOrder(catalog, 11 * 60)).toEqual(['cold', 'espresso', 'slow', 'bakery']);
    expect(menuGroupOrder(catalog, 17 * 60 + 59)).toEqual(['cold', 'espresso', 'slow', 'bakery']);
    expect(menuGroupOrder(catalog, 18 * 60)).toEqual(['espresso', 'slow', 'cold', 'bakery']);
  });

  it('lists the items of each group together', () => {
    const afternoon = sortedMenu(catalog, 14 * 60).map((item) => item.id);
    expect(afternoon.slice(0, 2)).toEqual(['cold-brew', 'coconut-cold-brew']);
    expect(afternoon).toHaveLength(catalog.items.length);
  });
});
