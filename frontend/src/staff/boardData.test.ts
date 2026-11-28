import { describe, expect, it } from 'vitest';
import { makeStaffOrder } from '../test/orderFixture';
import { applyBoardReply, groupOrders, isFresh, mergeOrders, newOrders, pickupTiming, replaceOrder, type BoardData } from './boardData';

const MINUTE = 60_000;
const NOW = Date.parse('2026-11-28T02:00:00Z');
const at = (minutesFromNow: number) => new Date(NOW + minutesFromNow * MINUTE).toISOString();

const order = (publicId: string, pickupInMinutes: number, overrides: Parameters<typeof makeStaffOrder>[0] = {}) =>
  makeStaffOrder({ publicId, number: `A5-${publicId.toUpperCase()}`, pickupAt: at(pickupInMinutes), placedAt: at(-1), ...overrides });

describe('mergeOrders', () => {
  it('puts changed orders over the ones already held, matching by publicId', () => {
    const before = [order('a', 10), order('b', 20)];
    const merged = mergeOrders(before, [order('b', 20, { status: 'preparing' })]);

    expect(merged.map((o) => `${o.publicId}:${o.status}`)).toEqual(['a:received', 'b:preparing']);
  });

  it('adds new orders and keeps soonest pickup first', () => {
    const merged = mergeOrders([order('late', 30)], [order('soon', 5), order('mid', 15)]);
    expect(merged.map((o) => o.publicId)).toEqual(['soon', 'mid', 'late']);
  });

  it('does not double up an order that arrives twice', () => {
    expect(mergeOrders([order('a', 10)], [order('a', 10), order('a', 10)])).toHaveLength(1);
  });

  it('breaks a tie on pickup time by order number', () => {
    expect(mergeOrders([], [order('b', 10), order('a', 10)]).map((o) => o.publicId)).toEqual(['a', 'b']);
  });
});

describe('applyBoardReply', () => {
  const reply = (date: string, orders = [order('a', 10)]) => ({ date, orders, cursor: '2026-11-28T01:59:55.000Z' });

  it('starts the board from the first reply', () => {
    expect(applyBoardReply(undefined, reply('2026-11-28'))).toEqual({ date: '2026-11-28', orders: [order('a', 10)], cursor: '2026-11-28T01:59:55.000Z' });
  });

  it('folds later replies into what is held and takes the new cursor', () => {
    const previous: BoardData = { date: '2026-11-28', orders: [order('a', 10)], cursor: 'old' };
    const next = applyBoardReply(previous, reply('2026-11-28', [order('a', 10, { status: 'ready' }), order('b', 20)]));
    expect(next).not.toBe('refetch');
    if (next === 'refetch') return;
    expect(next.orders.map((o) => o.status)).toEqual(['ready', 'received']);
    expect(next.cursor).toBe('2026-11-28T01:59:55.000Z');
  });

  it('asks for the whole day again when the business day rolls over', () => {
    const previous: BoardData = { date: '2026-11-28', orders: [order('a', 10)], cursor: 'old' };
    expect(applyBoardReply(previous, reply('2026-11-29', []))).toBe('refetch');
  });
});

describe('replaceOrder', () => {
  it('shows one updated order straight away', () => {
    const data: BoardData = { date: '2026-11-28', orders: [order('a', 10), order('b', 20)], cursor: 'c' };
    const next = replaceOrder(data, order('a', 10, { status: 'preparing' }));
    expect(next?.orders.map((o) => o.status)).toEqual(['preparing', 'received']);
    expect(next?.cursor).toBe('c');
  });

  it('leaves an empty board empty', () => {
    expect(replaceOrder(undefined, order('a', 10))).toBeUndefined();
  });
});

describe('groupOrders', () => {
  it('splits the working columns from what is done, newest finish first', () => {
    const orders = [
      order('new', 5),
      order('making', 10, { status: 'preparing' }),
      order('ready', 15, { status: 'ready' }),
      order('older', 1, { status: 'collected', updatedAt: at(-30) }),
      order('newer', 2, { status: 'cancelled', cancelReason: 'no_show', updatedAt: at(-5) }),
    ];
    const columns = groupOrders(orders);

    expect(columns.received.map((o) => o.publicId)).toEqual(['new']);
    expect(columns.preparing.map((o) => o.publicId)).toEqual(['making']);
    expect(columns.ready.map((o) => o.publicId)).toEqual(['ready']);
    expect(columns.done.map((o) => o.publicId)).toEqual(['newer', 'older']);
  });
});

describe('newOrders', () => {
  it('finds received orders the board has not seen', () => {
    const orders = [order('seen', 5), order('fresh', 6), order('fresh-but-started', 7, { status: 'preparing' })];
    expect(newOrders(new Set(['seen']), orders).map((o) => o.publicId)).toEqual(['fresh']);
  });

  it('finds nothing when everything has been seen', () => {
    expect(newOrders(new Set(['a']), [order('a', 5)])).toEqual([]);
  });
});

describe('pickupTiming', () => {
  const timing = (pickupInMinutes: number, status: 'received' | 'preparing' = 'received') => pickupTiming(order('t', pickupInMinutes, { status }), NOW);

  it('is calm when pickup is well away', () => {
    expect(timing(45)).toEqual({ text: 'in 45 min', tone: 'calm' });
    expect(timing(90)).toEqual({ text: 'in 1 h 30 min', tone: 'calm' });
  });

  it('warns when pickup is close', () => {
    expect(timing(8)).toEqual({ text: 'in 8 min', tone: 'soon' });
    expect(timing(0)).toEqual({ text: 'now', tone: 'soon' });
  });

  it('flags a late order', () => {
    expect(timing(-6)).toEqual({ text: '6 min late', tone: 'late' });
  });

  it('says how long a ready order has waited on the counter instead', () => {
    const ready = (minutesAgo: number) => makeStaffOrder({ status: 'ready', pickupAt: at(-40), events: [{ status: 'received', at: at(-50) }, { status: 'ready', at: at(-minutesAgo) }] });
    expect(pickupTiming(ready(0.2), NOW)).toEqual({ text: 'Ready just now', tone: 'calm' });
    expect(pickupTiming(ready(7), NOW)).toEqual({ text: 'Ready 7 min ago', tone: 'calm' });
    expect(pickupTiming(ready(20), NOW)).toEqual({ text: 'Ready 20 min ago', tone: 'late' });
  });

  it('says nothing for a finished order', () => {
    expect(pickupTiming(order('t', -60, { status: 'collected' }), NOW).text).toBe('');
    expect(pickupTiming(order('t', -60, { status: 'cancelled', cancelReason: 'other' }), NOW).text).toBe('');
  });
});

describe('isFresh', () => {
  it('flags an order for two minutes after it was placed', () => {
    expect(isFresh({ status: 'received', placedAt: at(-1) }, NOW)).toBe(true);
    expect(isFresh({ status: 'received', placedAt: at(-3) }, NOW)).toBe(false);
    expect(isFresh({ status: 'preparing', placedAt: at(-1) }, NOW)).toBe(false);
  });
});
