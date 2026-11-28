import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { PERSISTED_QUERY_KEYS } from './queries';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        // Kept at least as long as the persisted copy, or the saved menu would be thrown away on load.
        gcTime: DAY_MS,
      },
    },
  });
}

export function createPersistOptions(): Omit<PersistQueryClientOptions, 'queryClient'> {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage;
  return {
    persister: createSyncStoragePersister({ storage, key: 'alas-singko-query-cache-v1' }),
    maxAge: DAY_MS,
    // Bump when the shape of a persisted reply changes, so old copies are dropped instead of misread.
    buster: 'menu-shop-1',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success' && PERSISTED_QUERY_KEYS.includes(String(query.queryKey[0])),
    },
  };
}
