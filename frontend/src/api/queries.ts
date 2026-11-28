import { menuResponseSchema, pickupSlotsResponseSchema, shopResponseSchema } from '@kape/contract';
import { queryOptions } from '@tanstack/react-query';
import { apiGet } from './client';

const MINUTE = 60_000;

/** The menu changes when staff mark something sold out, so look again every minute and when the tab comes back. */
export const menuQuery = queryOptions({
  queryKey: ['menu'],
  queryFn: ({ signal }) => apiGet('/api/v1/menu', menuResponseSchema, signal),
  staleTime: 30_000,
  refetchInterval: MINUTE,
  refetchOnWindowFocus: true,
});

export const shopQuery = queryOptions({
  queryKey: ['shop'],
  queryFn: ({ signal }) => apiGet('/api/v1/shop', shopResponseSchema, signal),
  staleTime: 30_000,
  refetchInterval: MINUTE,
  refetchOnWindowFocus: true,
});

/** Never reused: the offered times depend on the minute it is right now. */
export const pickupSlotsQuery = queryOptions({
  queryKey: ['pickup-slots'],
  queryFn: ({ signal }) => apiGet('/api/v1/pickup-slots', pickupSlotsResponseSchema, signal),
  staleTime: 0,
  gcTime: 0,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
});

/** Only these are saved between visits, so a returning customer sees the last menu while the new one loads. */
export const PERSISTED_QUERY_KEYS: readonly string[] = ['menu', 'shop'];
