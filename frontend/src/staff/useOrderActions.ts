import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CancelReason, OrderStatus, PaymentMethod, StaffOrder } from '@kape/contract';
import { moveOrder, payOrder } from '../api/staff';
import { replaceOrder, type BoardData } from './boardData';
import { conflictOrder, staffErrorMessage } from './staffErrors';
import { BOARD_KEY } from './useBoard';
import { useStaffCall } from './useStaffCall';

type Move = { order: StaffOrder; to: OrderStatus; reason?: CancelReason };
type Payment = { order: StaffOrder; method: PaymentMethod };

/** Pressing a button on a ticket: move the order along, or record how it was paid. */
export function useOrderActions(notify: (message: string) => void) {
  const call = useStaffCall();
  const queryClient = useQueryClient();

  /** Shows the server's answer straight away, instead of waiting for the next poll. */
  const show = (order: StaffOrder) => queryClient.setQueryData<BoardData>(BOARD_KEY, (data) => replaceOrder(data, order));

  const onError = (error: unknown) => {
    // If someone else got there first, show the order as it really is.
    const current = conflictOrder(error);
    if (current) show(current);
    notify(staffErrorMessage(error));
  };

  const move = useMutation({
    mutationFn: ({ order, to, reason }: Move) => call((token) => moveOrder(token, order.publicId, { from: order.status, to, reason })),
    onSuccess: show,
    onError,
  });

  const pay = useMutation({
    mutationFn: ({ order, method }: Payment) => call((token) => payOrder(token, order.publicId, method)),
    onSuccess: show,
    onError,
  });

  /** True while a button on this order is waiting for the server. */
  const busy = (order: StaffOrder) =>
    (move.isPending && move.variables?.order.publicId === order.publicId) || (pay.isPending && pay.variables?.order.publicId === order.publicId);

  return { move: move.mutate, pay: pay.mutate, busy };
}
