import { useMemo } from 'react';
import { useOptionalCatalog } from '../data/CatalogContext';
import { cartTotal, type CartLine } from '../lib/pricing';
import type { CartAction } from './cartReducer';
import { useCartStore } from './cartStore';

export type CartState = {
  lines: CartLine[];
  itemCount: number;
  /** In pesos. Zero until the menu has loaded, because the prices come from it. */
  total: number;
  dispatch: (action: CartAction) => void;
};

export function useCart(): CartState {
  const lines = useCartStore((state) => state.lines);
  const dispatch = useCartStore((state) => state.dispatch);
  const catalog = useOptionalCatalog();

  return useMemo(
    () => ({
      lines,
      dispatch,
      itemCount: lines.reduce((count, line) => count + line.quantity, 0),
      total: catalog ? cartTotal(lines, catalog) : 0,
    }),
    [lines, dispatch, catalog],
  );
}
