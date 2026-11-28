import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PlacedOrder } from '../lib/orders';
import { cleanOrder, keepCurrent } from './orderHistory';

type OrderStore = {
  /** Orders placed in this browser, newest first, each kept until two hours after its pickup time. */
  orders: PlacedOrder[];
  addOrder: (order: PlacedOrder) => void;
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) => set((state) => ({ orders: keepCurrent([order, ...state.orders]) })),
    }),
    {
      name: 'alas-singko-orders-v3',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ orders: state.orders }),
      merge: (saved, current) => {
        const list = (saved as { orders?: unknown } | undefined)?.orders;
        const orders = Array.isArray(list) ? list.map(cleanOrder).filter((order): order is PlacedOrder => order !== null) : [];
        return { ...current, orders: keepCurrent(orders) };
      },
    },
  ),
);
