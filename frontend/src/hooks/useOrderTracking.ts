import { useQueries } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { fetchOrder } from '../api/orders';
import { isCurrent } from '../cart/orderHistory';
import { useOrderStore } from '../cart/orderStore';
import { isFinished, type OrderResponse } from '../lib/orders';
import { markAlerted, wasAlerted } from '../lib/readyAlert';

const POLL_MS = 15_000;

/** Same status, same history, same payment: nothing worth re-rendering for. */
function sameProgress(a: OrderResponse, b: OrderResponse): boolean {
  return a.status === b.status && a.paid === b.paid && a.cancelReason === b.cancelReason && a.events.length === b.events.length;
}

const live = (results: { data: OrderResponse | undefined }[]) => results.map((result) => result.data);

/**
 * Asks the API about each order the customer has on the way, every 15 seconds and whenever the tab comes back,
 * until it is collected, cancelled, or two hours past its pickup time. New news is saved into the order store,
 * so every screen reads one copy. Calls `onReady` once per order when it turns ready.
 */
export function useOrderTracking(onReady: (order: OrderResponse) => void) {
  const orders = useOrderStore((state) => state.orders);
  const replaceOrder = useOrderStore((state) => state.replaceOrder);
  const handleReady = useEffectEvent(onReady);

  const tracked = orders.filter((order) => isCurrent(order) && !isFinished(order));
  const latest = useQueries({
    queries: tracked.map((order) => ({
      queryKey: ['order', order.publicId],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchOrder(order.publicId, signal),
      refetchInterval: (query: { state: { data: OrderResponse | undefined } }) => {
        const data = query.state.data;
        return data && isFinished(data) ? false : POLL_MS;
      },
      retry: 1,
    })),
    combine: live,
  });

  useEffect(() => {
    for (const fresh of latest) {
      if (!fresh) continue;
      const stored = useOrderStore.getState().orders.find((order) => order.publicId === fresh.publicId);
      if (!stored) continue;
      if (!sameProgress(stored, fresh)) replaceOrder(fresh);
      if (fresh.status === 'ready' && !wasAlerted(fresh.publicId)) {
        markAlerted(fresh.publicId);
        handleReady(fresh);
      }
    }
  }, [latest, replaceOrder]);
}
