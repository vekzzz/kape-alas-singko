import { useEffect, useEffectEvent, useState } from 'react';
import { isCurrent } from '../cart/orderHistory';
import type { PlacedOrder } from '../lib/orders';
import { fetchOrderStatus, type OrderStatus } from '../lib/orderStatus';
import { markAlerted, wasAlerted } from '../lib/readyAlert';

const POLL_MS = 15_000;

export type OrderStatuses = Record<string, OrderStatus>;

export function useOrderStatuses(orders: PlacedOrder[], onReady: (order: PlacedOrder) => void): OrderStatuses {
  const [statuses, setStatuses] = useState<OrderStatuses>({});
  const handleReady = useEffectEvent(onReady);

  useEffect(() => {
    const tracked = orders.filter((order) => order.sent);
    if (tracked.length === 0) return;
    const finished = new Set<string>();
    let cancelled = false;
    let timer = 0;

    const checkOne = async (order: PlacedOrder) => {
      if (finished.has(order.number) || !isCurrent(order)) return;
      let status: OrderStatus | null = null;
      try {
        status = await fetchOrderStatus(order.number);
      } catch {}
      if (cancelled || !status) return;

      setStatuses((current) => (current[order.number] === status ? current : { ...current, [order.number]: status }));
      if (status === 'ready' && !wasAlerted(order.number)) {
        markAlerted(order.number);
        handleReady(order);
      }
      if (status === 'collected') finished.add(order.number);
    };

    const poll = async () => {
      window.clearTimeout(timer);
      await Promise.all(tracked.map(checkOne));
      if (cancelled || tracked.every((order) => finished.has(order.number) || !isCurrent(order))) return;
      timer = window.setTimeout(poll, POLL_MS);
    };

    const pollWhenBack = () => {
      if (!document.hidden) poll();
    };

    poll();
    document.addEventListener('visibilitychange', pollWhenBack);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', pollWhenBack);
    };
  }, [orders]);

  return statuses;
}
