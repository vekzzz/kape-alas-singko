import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOrderStatus, parseOrderStatus, statusUrl } from './orderStatus';

describe('parseOrderStatus', () => {
  it('reads a known status, ignoring case and spaces', () => {
    expect(parseOrderStatus({ status: 'ready' })).toBe('ready');
    expect(parseOrderStatus({ status: ' Preparing ' })).toBe('preparing');
  });

  it('ignores anything else', () => {
    expect(parseOrderStatus(null)).toBeNull();
    expect(parseOrderStatus({ number: 'A5-001' })).toBeNull();
    expect(parseOrderStatus({ status: 'lost' })).toBeNull();
    expect(parseOrderStatus({ status: 3 })).toBeNull();
  });
});

describe('statusUrl', () => {
  it('adds the order number to the endpoint', () => {
    expect(statusUrl('https://example.test/exec', 'A5-K7P')).toBe('https://example.test/exec?number=A5-K7P');
    expect(statusUrl('https://example.test/exec?v=2', 'A5-K7P')).toBe('https://example.test/exec?v=2&number=A5-K7P');
  });
});

describe('fetchOrderStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not ask when no endpoint is set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchOrderStatus('A5-K7P', '')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the status the endpoint replies with', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ready' }))));
    await expect(fetchOrderStatus('A5-K7P', 'https://example.test/exec')).resolves.toBe('ready');
  });

  it('fails when the endpoint answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(fetchOrderStatus('A5-K7P', 'https://example.test/exec')).rejects.toThrow('500');
  });
});
