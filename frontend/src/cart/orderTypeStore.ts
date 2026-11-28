import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OrderType } from '../lib/orders';

type OrderTypeStore = {
  /** Dine in or take out, remembered for this browser session only. Null until the customer chooses. */
  orderType: OrderType | null;
  setOrderType: (orderType: OrderType | null) => void;
};

export const useOrderTypeStore = create<OrderTypeStore>()(
  persist(
    (set) => ({
      orderType: null,
      setOrderType: (orderType) => set({ orderType }),
    }),
    {
      name: 'alas-singko-order-type-v2',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ orderType: state.orderType }),
      merge: (saved, current) => {
        const type = (saved as { orderType?: unknown } | undefined)?.orderType;
        return { ...current, orderType: type === 'dine-in' || type === 'take-out' ? type : null };
      },
    },
  ),
);
