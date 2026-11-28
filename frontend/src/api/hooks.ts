import { useQuery } from '@tanstack/react-query';
import { buildCatalog } from '../data/menu';
import { menuQuery, pickupSlotsQuery, shopQuery } from './queries';

/** The menu, shaped for the screens. `data` is undefined until the first reply (or a saved copy) arrives. */
export function useMenu() {
  // `buildCatalog` is a module-level function, so React Query only reruns it when the reply changes.
  return useQuery({ ...menuQuery, select: buildCatalog });
}

export function useShop() {
  return useQuery(shopQuery);
}

export function usePickupSlotsQuery() {
  return useQuery(pickupSlotsQuery);
}
