import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOrder } from './validate.js';

const valid = {
  number: 'A5-K7P',
  orderType: 'take-out',
  name: ' Ana ',
  phone: '09171234567',
  pickupAt: '2026-11-27T02:30:00.000Z',
  placedAt: '2026-11-27T02:00:00.000Z',
  total: 165,
  items: [{ item: 'Latte', options: 'Large, Oat milk', quantity: 1, lineTotal: 165 }],
};

test('accepts the payload the frontend sends and trims the name', () => {
  const result = parseOrder(valid);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.order.name, 'Ana');
});

test('rejects a bad order number, phone and empty items', () => {
  assert.equal(parseOrder({ ...valid, number: 'XYZ' }).ok, false);
  assert.equal(parseOrder({ ...valid, phone: '12345' }).ok, false);
  assert.equal(parseOrder({ ...valid, items: [] }).ok, false);
});
