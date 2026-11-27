import { describe, expect, it } from 'vitest';
import { parseCartLines } from './cartStorage';

const options = { size: 'regular', temperature: 'hot', milk: 'whole', extraShot: false };
const line = { id: 'l1', itemId: 'latte', options, note: '', quantity: 1 };

describe('parseCartLines', () => {
  it('keeps well-formed lines', () => {
    expect(parseCartLines([line])).toEqual([line]);
  });

  it('drops items that are gone or sold out', () => {
    expect(parseCartLines([{ ...line, itemId: 'no-such-drink' }])).toEqual([]);
    expect(parseCartLines([{ ...line, itemId: 'ube-pandesal' }])).toEqual([]);
  });

  it('drops malformed lines', () => {
    expect(parseCartLines([{ ...line, quantity: 0 }, { ...line, quantity: 1.5 }, { ...line, quantity: '2' }])).toEqual([]);
    expect(parseCartLines([{ ...line, options: { ...options, milk: 'soy' } }, { ...line, note: undefined }, null])).toEqual([]);
  });

  it('ignores anything that is not a list', () => {
    expect(parseCartLines({ lines: [line] })).toEqual([]);
  });
});
