import { describe, expect, it } from 'vitest';
import { catalog } from '../test/menuFixture';
import { cartTotal, defaultOptions, describeOptions, unitPrice } from './pricing';

const latte = catalog.getItem('latte');
const pandesal = catalog.getItem('pandesal');

describe('unitPrice', () => {
  it('adds the cost of each extra', () => {
    expect(unitPrice(latte, defaultOptions(latte))).toBe(170);
    expect(unitPrice(latte, { size: 'large', temperature: 'iced', milk: 'oat', extraShot: true })).toBe(170 + 30 + 40 + 50);
  });

  it('ignores extras the item does not offer', () => {
    expect(unitPrice(pandesal, { size: 'large', temperature: 'hot', milk: 'oat', extraShot: true })).toBe(90);
  });
});

describe('cartTotal', () => {
  it('adds up every line', () => {
    const total = cartTotal(
      [
        { id: 'a', itemId: 'latte', options: defaultOptions(latte), note: '', quantity: 2 },
        { id: 'b', itemId: 'pandesal', options: defaultOptions(pandesal), note: '', quantity: 1 },
      ],
      catalog,
    );
    expect(total).toBe(430);
  });

  it('adds nothing for an item that is no longer on the menu', () => {
    const gone = { id: 'x', itemId: 'gone', options: defaultOptions(latte), note: '', quantity: 3 };
    expect(cartTotal([gone], catalog)).toBe(0);
  });
});

describe('describeOptions', () => {
  it('lists only the choices the item offers', () => {
    expect(describeOptions(latte, { size: 'large', temperature: 'iced', milk: 'oat', extraShot: true })).toBe('Large, iced, oat milk, extra shot');
    expect(describeOptions(pandesal, defaultOptions(pandesal))).toBe('');
  });
});
