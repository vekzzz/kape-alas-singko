import {
  staffLoginResponseSchema,
  staffMenuItemResponseSchema,
  staffOrderSchema,
  staffOrdersResponseSchema,
  staffShopResponseSchema,
  type PaymentMethod,
  type StaffOrder,
  type StaffOrdersResponse,
  type StaffStatusRequest,
} from '@kape/contract';
import { apiGet, apiPatch, apiPost } from './client';

const asIs = { parse: (data: unknown) => data };
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function loginStaff(email: string, password: string) {
  return apiPost('/api/v1/staff/login', staffLoginResponseSchema, { email, password });
}

export function logoutStaff(token: string) {
  return apiPost('/api/v1/staff/logout', asIs, {}, auth(token));
}

/** Today's orders. With `since` (the cursor from the last reply), only the ones that changed after it. */
export function fetchStaffOrders(token: string, since?: string, signal?: AbortSignal): Promise<StaffOrdersResponse> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return apiGet(`/api/v1/staff/orders${query}`, staffOrdersResponseSchema, signal, auth(token));
}

export function moveOrder(token: string, publicId: string, request: StaffStatusRequest): Promise<StaffOrder> {
  return apiPost(`/api/v1/staff/orders/${encodeURIComponent(publicId)}/status`, staffOrderSchema, request, auth(token));
}

export function payOrder(token: string, publicId: string, method: PaymentMethod): Promise<StaffOrder> {
  return apiPost(`/api/v1/staff/orders/${encodeURIComponent(publicId)}/payment`, staffOrderSchema, { method }, auth(token));
}

export function setItemSoldOut(token: string, itemId: string, isSoldOut: boolean) {
  return apiPatch(`/api/v1/staff/menu-items/${encodeURIComponent(itemId)}`, staffMenuItemResponseSchema, { isSoldOut }, auth(token));
}

export function setAcceptingOrders(token: string, acceptingOrders: boolean) {
  return apiPatch('/api/v1/staff/shop', staffShopResponseSchema, { acceptingOrders }, auth(token));
}
