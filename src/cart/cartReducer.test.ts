import { describe, expect, it } from 'vitest';
import { getMenuItem } from '../data/menu';
import { defaultOptions } from '../lib/pricing';
import { cartReducer } from './cartReducer';

const latteOptions = defaultOptions(getMenuItem('latte'));
const addLatte = { type: 'add', itemId: 'latte', options: latteOptions, note: '', quantity: 1 } as const;

describe('cartReducer', () => {
  it('stacks the same drink with the same choices onto one line', () => {
    const lines = cartReducer(cartReducer([], addLatte), addLatte);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
  });

  it('keeps different choices on separate lines', () => {
    const iced = { ...addLatte, options: { ...latteOptions, temperature: 'iced' as const } };
    expect(cartReducer(cartReducer([], addLatte), iced)).toHaveLength(2);
  });

  it('removes a line when its quantity drops to zero', () => {
    const [line] = cartReducer([], addLatte);
    expect(cartReducer([line!], { type: 'setQuantity', id: line!.id, quantity: 0 })).toEqual([]);
  });

  it('puts a removed line back in its old place', () => {
    const iced = { ...addLatte, options: { ...latteOptions, temperature: 'iced' as const } };
    const lines = cartReducer(cartReducer([], addLatte), iced);
    const remaining = cartReducer(lines, { type: 'remove', id: lines[0]!.id });
    expect(cartReducer(remaining, { type: 'restore', line: lines[0]!, index: 0 })).toEqual(lines);
  });

  it('does not restore a line twice', () => {
    const lines = cartReducer([], addLatte);
    expect(cartReducer(lines, { type: 'restore', line: lines[0]!, index: 0 })).toBe(lines);
  });
});
