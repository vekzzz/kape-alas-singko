import type { CreateOrderRequest } from '@kape/contract';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeOrder } from '../test/orderFixture';
import { ApiRequestError } from './client';
import { cancelOrder, fetchOrder, postOrder } from './orders';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const request: CreateOrderRequest = { orderType: 'take-out', name: 'Maria', phone: null, pickupAt: '2026-11-28T01:15:00.000Z', lines: [{ itemId: 'latte', quantity: 1 }], expectedTotalCentavos: 17000 };

describe('postOrder', () => {
  it('sends JSON with the idempotency key and returns the parsed order', async () => {
    const order = makeOrder();
    const fetchMock = vi.fn().mockResolvedValue(json(order, 201));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postOrder(request, 'key-12345678')).resolves.toEqual(order);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/orders$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'Idempotency-Key': 'key-12345678' });
    expect(JSON.parse(String(init.body))).toMatchObject({ name: 'Maria', expectedTotalCentavos: 17000 });
  });

  it('keeps the code and details of a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { code: 'PRICE_CHANGED', message: 'Prices changed.', details: { totalCentavos: 18000 } } }, 409)));

    const failure = await postOrder(request, 'key-12345678').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ status: 409, code: 'PRICE_CHANGED', details: { totalCentavos: 18000 } });
  });

  it('keeps the fields of a bad request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { code: 'VALIDATION', message: 'Check.', fields: { phone: 'Use a number like 0917 123 4567' } } }, 400)));
    await expect(postOrder(request, 'key-12345678')).rejects.toMatchObject({ fields: { phone: 'Use a number like 0917 123 4567' } });
  });

  it('rejects a reply that is not an order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ number: 'A5-K7P' }, 201)));
    await expect(postOrder(request, 'key-12345678')).rejects.toThrow();
  });
});

describe('fetchOrder and cancelOrder', () => {
  it('look an order up by its public id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(makeOrder()));
    vi.stubGlobal('fetch', fetchMock);
    await fetchOrder('k3T9xQ2mV7bN4cR8wY1zAg');
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/orders\/k3T9xQ2mV7bN4cR8wY1zAg$/);
  });

  it('cancel by posting to the order', async () => {
    const cancelled = makeOrder({ status: 'cancelled', cancelReason: 'customer_request' });
    const fetchMock = vi.fn().mockResolvedValue(json(cancelled));
    vi.stubGlobal('fetch', fetchMock);

    await expect(cancelOrder('k3T9xQ2mV7bN4cR8wY1zAg')).resolves.toEqual(cancelled);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/orders\/k3T9xQ2mV7bN4cR8wY1zAg\/cancel$/);
    expect(init.method).toBe('POST');
  });
});
