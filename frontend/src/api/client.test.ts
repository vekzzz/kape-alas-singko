import { shopResponseSchema } from '@kape/contract';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHOP_FIXTURE } from '../test/menuFixture';
import { ApiRequestError, apiGet } from './client';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiGet', () => {
  it('parses a good reply with the schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(SHOP_FIXTURE));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/api/v1/shop', shopResponseSchema)).resolves.toEqual(SHOP_FIXTURE);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/shop$/);
  });

  it('turns an API error into an error with its code and message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { code: 'NOT_FOUND', message: 'Nothing here.' } }, 404)));

    const failure = await apiGet('/api/v1/nope', shopResponseSchema).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Nothing here.' });
  });

  it('copes with an error that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 })));
    await expect(apiGet('/api/v1/shop', shopResponseSchema)).rejects.toMatchObject({ status: 502, message: 'The server answered 502' });
  });

  it('rejects a reply that does not match the contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ name: 'No hours or address' })));
    await expect(apiGet('/api/v1/shop', shopResponseSchema)).rejects.toThrow();
  });
});
