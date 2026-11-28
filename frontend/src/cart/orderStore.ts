import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OrderResponse } from '../lib/orders';
import { cleanOrder, keepCurrent } from './orderHistory';

type OrderStore = {
  /** Orders placed in this browser, newest first, each kept until two hours after its pickup time. */
  orders: OrderResponse[];
  addOrder: (order: OrderResponse) => void;
  /** Swaps in a newer copy of an order we already hold (new status, cancelled, paid). */
  replaceOrder: (order: OrderResponse) => void;
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) => set((state) => ({ orders: keepCurrent([order, ...state.orders.filter((o) => o.publicId !== order.publicId)]) })),
      replaceOrder: (order) => set((state) => ({ orders: state.orders.map((o) => (o.publicId === order.publicId ? order : o)) })),
    }),
    {
      // v4: orders are now the API's order record, keyed by publicId. Older saved orders are dropped.
      name: 'alas-singko-orders-v4',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ orders: state.orders }),
      merge: (saved, current) => {
        const list = (saved as { orders?: unknown } | undefined)?.orders;
        const orders = Array.isArray(list) ? list.map(cleanOrder).filter((order): order is OrderResponse => order !== null) : [];
        return { ...current, orders: keepCurrent(orders) };
      },
    },
  ),
);
