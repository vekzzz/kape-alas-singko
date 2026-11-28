import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StaffOrder } from '@kape/contract';
import { useEffect, useRef } from 'react';
import { fetchStaffOrders } from '../api/staff';
import { applyBoardReply, newOrders, type BoardData } from './boardData';
import { flagTitle, playNewOrderChime } from './staffAlert';
import { useStaffCall } from './useStaffCall';

export const BOARD_KEY = ['staff-board'] as const;

const POLL_MS = 5_000;

/**
 * Today's orders, kept fresh. After the first load it only asks what changed since the last reply, so a busy
 * board stays cheap. It keeps polling in a background tab, because that is when the new-order chime matters.
 */
export function useBoard() {
  const call = useStaffCall();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: BOARD_KEY,
    queryFn: async ({ signal }): Promise<BoardData> => {
      const previous = queryClient.getQueryData<BoardData>(BOARD_KEY);
      const reply = await call((token) => fetchStaffOrders(token, previous?.cursor, signal));
      const next = applyBoardReply(previous, reply);
      if (next !== 'refetch') return next;

      // A new business day began: the reply holds only what changed, so ask for the whole day.
      const whole = await call((token) => fetchStaffOrders(token, undefined, signal));
      return applyBoardReply(undefined, whole) as BoardData;
    },
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    // The interval tries again anyway, and the last good board stays on screen meanwhile.
    retry: false,
    staleTime: 0,
  });
}

/** Chimes, and flags the tab title if it is in the background, when an order arrives that the board has not seen. */
export function useNewOrderAlert(orders: StaffOrder[] | undefined) {
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!orders) return;
    if (seen.current === null) {
      // The first load is what was already there, not news.
      seen.current = new Set(orders.map((order) => order.publicId));
      return;
    }
    const arrived = newOrders(seen.current, orders);
    for (const order of orders) seen.current.add(order.publicId);
    if (arrived.length === 0) return;
    playNewOrderChime();
    flagTitle(arrived.length);
  }, [orders]);
}
