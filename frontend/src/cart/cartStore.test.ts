import { beforeEach, describe, expect, it } from 'vitest';
import { defaultOptions } from '../lib/pricing';
import { catalog } from '../test/menuFixture';
import { useCartStore } from './cartStore';

const latte = catalog.getItem('latte');
const add = (itemId: string, quantity = 1) =>
  useCartStore.getState().dispatch({ type: 'add', itemId, options: defaultOptions(catalog.findItem(itemId) ?? latte), note: '', quantity });

beforeEach(() => useCartStore.setState({ lines: [] }));

describe('cart store', () => {
  it('runs every change through the reducer', () => {
    add(latte.id);
    add(latte.id);
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
  });

  it('keepOnly drops what the shop can no longer make', () => {
    add('latte');
    add('ube-pandesal');
    add('gone');

    useCartStore.getState().keepOnly((line) => {
      const item = catalog.findItem(line.itemId);
      return item !== undefined && !item.soldOut;
    });

    expect(useCartStore.getState().lines.map((line) => line.itemId)).toEqual(['latte']);
  });

  it('keepOnly leaves the same array alone when nothing is dropped', () => {
    add('latte');
    const before = useCartStore.getState().lines;
    useCartStore.getState().keepOnly(() => true);
    expect(useCartStore.getState().lines).toBe(before);
  });
});
