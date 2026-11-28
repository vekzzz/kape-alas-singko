import { orderResponseSchema, type CreateOrderRequest, type OrderResponse } from '@kape/contract';
import { apiGet, apiPost } from './client';

/** Places an order. Sending the same `idempotencyKey` again returns the first order instead of making another. */
export function postOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<OrderResponse> {
  return apiPost('/api/v1/orders', orderResponseSchema, request, { 'Idempotency-Key': idempotencyKey });
}

export function fetchOrder(publicId: string, signal?: AbortSignal): Promise<OrderResponse> {
  return apiGet(`/api/v1/orders/${encodeURIComponent(publicId)}`, orderResponseSchema, signal);
}

export function cancelOrder(publicId: string): Promise<OrderResponse> {
  return apiPost(`/api/v1/orders/${encodeURIComponent(publicId)}/cancel`, orderResponseSchema);
}
