export type OrderStatus = 'received' | 'preparing' | 'ready' | 'collected';

export const ORDER_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready', 'collected'];

const STATUS_TIMEOUT_MS = 8_000;

export function parseOrderStatus(reply: unknown): OrderStatus | null {
  if (!reply || typeof reply !== 'object' || !('status' in reply) || typeof reply.status !== 'string') return null;
  const status = reply.status.trim().toLowerCase();
  return ORDER_STATUSES.find((known) => known === status) ?? null;
}

export function statusUrl(endpoint: string, orderNumber: string): string {
  const url = new URL(endpoint, globalThis.location?.href);
  url.searchParams.set('number', orderNumber);
  return url.toString();
}

export async function fetchOrderStatus(orderNumber: string, endpoint: string | undefined = import.meta.env.VITE_ORDER_ENDPOINT): Promise<OrderStatus | null> {
  if (!endpoint) return null;
  const response = await fetch(statusUrl(endpoint, orderNumber), { signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Order endpoint answered ${response.status}`);
  return parseOrderStatus(await response.json().catch(() => null));
}
