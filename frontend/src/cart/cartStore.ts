import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartLine } from '../lib/pricing';
import { cartReducer, type CartAction } from './cartReducer';
import { parseCartLines } from './cartStorage';

type CartStore = {
  lines: CartLine[];
  /** Every change to the cart goes through `cartReducer`. */
  dispatch: (action: CartAction) => void;
  /** Drops lines the shop can no longer make (item removed or sold out). Called when the menu loads. */
  keepOnly: (isOrderable: (line: CartLine) => boolean) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      dispatch: (action) => set((state) => ({ lines: cartReducer(state.lines, action) })),
      keepOnly: (isOrderable) =>
        set((state) => {
          const lines = state.lines.filter(isOrderable);
          return lines.length === state.lines.length ? state : { lines };
        }),
    }),
    {
      // Bump the name when the shape of a cart line changes, so old saved carts are dropped instead of breaking the page.
      name: 'alas-singko-cart-v3',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      merge: (saved, current) => ({ ...current, lines: parseCartLines((saved as { lines?: unknown } | undefined)?.lines) }),
    },
  ),
);
