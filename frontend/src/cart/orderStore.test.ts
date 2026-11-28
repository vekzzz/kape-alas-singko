import { beforeEach, describe, expect, it } from 'vitest';
import { makeOrder } from '../test/orderFixture';
import { MAX_ORDERS } from './orderHistory';
import { useOrderStore } from './orderStore';

const order = (publicId: string, placedAt: number) => makeOrder({ publicId, placedAt: new Date(placedAt).toISOString() });

beforeEach(() => useOrderStore.setState({ orders: [] }));

describe('order store', () => {
  it('puts the newest order first', () => {
    useOrderStore.getState().addOrder(order('old', 1_000));
    useOrderStore.getState().addOrder(order('new', 2_000));
    expect(useOrderStore.getState().orders.map((o) => o.publicId)).toEqual(['new', 'old']);
  });

  it('keeps at most five orders', () => {
    for (let i = 0; i < MAX_ORDERS + 2; i++) useOrderStore.getState().addOrder(order(`order-${i}`, i));
    expect(useOrderStore.getState().orders).toHaveLength(MAX_ORDERS);
    expect(useOrderStore.getState().orders[0]?.publicId).toBe(`order-${MAX_ORDERS + 1}`);
  });

  it('forgets an order two hours after its pickup time', () => {
    const stale = makeOrder({ pickupAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() });
    useOrderStore.getState().addOrder(stale);
    expect(useOrderStore.getState().orders).toEqual([]);
  });

  it('does not keep the same order twice', () => {
    useOrderStore.getState().addOrder(order('same', 1));
    useOrderStore.getState().addOrder(order('same', 2));
    expect(useOrderStore.getState().orders).toHaveLength(1);
  });

  it('swaps in a newer copy of an order', () => {
    useOrderStore.getState().addOrder(makeOrder({ publicId: 'a' }));
    useOrderStore.getState().addOrder(makeOrder({ publicId: 'b' }));

    useOrderStore.getState().replaceOrder(makeOrder({ publicId: 'a', status: 'cancelled', cancelReason: 'customer_request' }));

    const [first, second] = useOrderStore.getState().orders.slice().sort((x, y) => x.publicId.localeCompare(y.publicId));
    expect(first).toMatchObject({ publicId: 'a', status: 'cancelled' });
    expect(second).toMatchObject({ publicId: 'b', status: 'received' });
  });

  it('ignores a newer copy of an order it does not hold', () => {
    useOrderStore.getState().replaceOrder(makeOrder({ publicId: 'unknown' }));
    expect(useOrderStore.getState().orders).toEqual([]);
  });
});
