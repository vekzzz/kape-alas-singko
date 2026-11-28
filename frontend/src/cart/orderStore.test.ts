import { beforeEach, describe, expect, it } from 'vitest';
import type { PlacedOrder } from '../lib/orders';
import { MAX_ORDERS } from './orderHistory';
import { useOrderStore } from './orderStore';

function order(number: string, placedAt: number): PlacedOrder {
  return { number, orderType: 'take-out', name: 'Ana', phone: '', placedAt, pickupAt: Date.now() + 30 * 60_000, lines: [], total: 0, sent: true };
}

beforeEach(() => useOrderStore.setState({ orders: [] }));

describe('order store', () => {
  it('puts the newest order first', () => {
    useOrderStore.getState().addOrder(order('A5-OLD', 1000));
    useOrderStore.getState().addOrder(order('A5-NEW', 2000));
    expect(useOrderStore.getState().orders.map((o) => o.number)).toEqual(['A5-NEW', 'A5-OLD']);
  });

  it('keeps at most five orders', () => {
    for (let i = 0; i < MAX_ORDERS + 2; i++) useOrderStore.getState().addOrder(order(`A5-00${i}`, i));
    expect(useOrderStore.getState().orders).toHaveLength(MAX_ORDERS);
    expect(useOrderStore.getState().orders[0]?.number).toBe(`A5-00${MAX_ORDERS + 1}`);
  });

  it('forgets an order two hours after its pickup time', () => {
    const stale = { ...order('A5-OLD', 1), pickupAt: Date.now() - 3 * 60 * 60_000 };
    useOrderStore.getState().addOrder(stale);
    expect(useOrderStore.getState().orders).toEqual([]);
  });
});
