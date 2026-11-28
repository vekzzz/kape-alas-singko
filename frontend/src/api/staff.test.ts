import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStaffOrder } from '../test/orderFixture';
import { ApiRequestError } from './client';
import { fetchStaffOrders, loginStaff, moveOrder, payOrder, setAcceptingOrders, setItemSoldOut } from './staff';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const stub = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
const lastCall = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls[0] as [string, RequestInit];

describe('staff api', () => {
  it('signs in and parses the session', async () => {
    const fetchMock = stub(json({ token: 'tok', staff: { id: 1, name: 'Ana', role: 'barista' }, expiresAt: '2026-11-28T14:00:00.000Z' }));
    await expect(loginStaff('ana@example.com', 'secret')).resolves.toMatchObject({ token: 'tok' });

    const [url, init] = lastCall(fetchMock);
    expect(url).toMatch(/\/api\/v1\/staff\/login$/);
    expect(JSON.parse(String(init.body))).toEqual({ email: 'ana@example.com', password: 'secret' });
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('sends the token as a bearer header and asks only for what changed', async () => {
    const fetchMock = stub(json({ date: '2026-11-28', orders: [makeStaffOrder()], cursor: '2026-11-28T01:59:55.000Z' }));
    const board = await fetchStaffOrders('tok', '2026-11-28T01:00:00.000Z');

    expect(board.orders).toHaveLength(1);
    const [url, init] = lastCall(fetchMock);
    expect(url).toContain('/api/v1/staff/orders?since=2026-11-28T01%3A00%3A00.000Z');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('asks for the whole day when there is no cursor', async () => {
    const fetchMock = stub(json({ date: '2026-11-28', orders: [], cursor: '2026-11-28T01:59:55.000Z' }));
    await fetchStaffOrders('tok');
    expect(lastCall(fetchMock)[0]).toMatch(/\/api\/v1\/staff\/orders$/);
  });

  it('moves an order, saying what it thinks the status is', async () => {
    const fetchMock = stub(json(makeStaffOrder({ status: 'preparing' })));
    await expect(moveOrder('tok', 'abc', { from: 'received', to: 'preparing' })).resolves.toMatchObject({ status: 'preparing' });

    const [url, init] = lastCall(fetchMock);
    expect(url).toMatch(/\/staff\/orders\/abc\/status$/);
    expect(JSON.parse(String(init.body))).toEqual({ from: 'received', to: 'preparing' });
  });

  it('records payment', async () => {
    const fetchMock = stub(json(makeStaffOrder({ paid: true, paymentMethod: 'cash', paidAt: '2026-11-28T02:00:00.000Z' })));
    await payOrder('tok', 'abc', 'cash');
    expect(JSON.parse(String(lastCall(fetchMock)[1].body))).toEqual({ method: 'cash' });
  });

  it('patches sold-out and pause', async () => {
    const soldOut = stub(json({ id: 'latte', isSoldOut: true }));
    await expect(setItemSoldOut('tok', 'latte', true)).resolves.toEqual({ id: 'latte', isSoldOut: true });
    expect(lastCall(soldOut)[1].method).toBe('PATCH');

    const pause = stub(json({ acceptingOrders: false }));
    await expect(setAcceptingOrders('tok', false)).resolves.toEqual({ acceptingOrders: false });
    expect(lastCall(pause)[0]).toMatch(/\/staff\/shop$/);
  });

  it('keeps the code and details of a refusal', async () => {
    stub(json({ error: { code: 'STATUS_CONFLICT', message: 'Moved.', details: { order: makeStaffOrder() } } }, 409));
    const failure = await moveOrder('tok', 'abc', { from: 'received', to: 'preparing' }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ status: 409, code: 'STATUS_CONFLICT' });
  });
});
