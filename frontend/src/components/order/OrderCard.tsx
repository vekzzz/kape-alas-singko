import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cancelOrder } from '../../api/orders';
import { useOrderStore } from '../../cart/orderStore';
import { cancelOrderMessage } from '../../lib/orderErrors';
import { ORDER_TYPE_LABELS, type OrderResponse } from '../../lib/orders';
import { formatPeso } from '../../lib/pricing';
import { formatPickup } from '../../lib/time';
import { OrderTracker } from './OrderTracker';

type OrderCardProps = { order: OrderResponse };

export function OrderCard({ order }: OrderCardProps) {
  const pickup = formatPickup(Date.parse(order.pickupAt), Date.now());
  const cancelled = order.status === 'cancelled';

  return (
    <article className="order-card" aria-label={`Order ${order.number}`}>
      <div className="ticket">
        <p className="eyebrow">{eyebrow(order)}</p>
        <p className="ticket-label">Your order number</p>
        <p className="ticket-number num">{order.number}</p>
        <p className="ticket-type">
          {ORDER_TYPE_LABELS[order.orderType]} · {cancelled ? `was for ${pickup}` : `ready ${pickup}`}
        </p>
      </div>

      {order.status !== 'cancelled' && <OrderTracker status={order.status} />}

      <p className="lead" role={cancelled ? 'status' : undefined}>
        {message(order, pickup)}
      </p>

      <ul className="receipt">
        {order.lines.map((line, index) => (
          <li key={index}>
            <span>
              {line.quantity} × {line.itemName}
              {line.optionLabels.length > 0 && <span className="soft small"> · {line.optionLabels.join(', ')}</span>}
              {line.note && <span className="soft small"> · “{line.note}”</span>}
            </span>
            <span className="num">{formatPeso(line.lineTotalCentavos / 100)}</span>
          </li>
        ))}
        <li className="receipt-total">
          <span>{cancelled ? 'Nothing to pay' : order.paid ? 'Paid at the counter' : "You'll pay at the counter"}</span>
          <span className="num">{formatPeso(order.totalCentavos / 100)}</span>
        </li>
      </ul>

      {order.status === 'received' && <CancelOrder order={order} />}
    </article>
  );
}

/** Two taps, so a stray touch does not throw an order away. Only offered until the bar starts on it. */
function CancelOrder({ order }: { order: OrderResponse }) {
  const replaceOrder = useOrderStore((state) => state.replaceOrder);
  const queryClient = useQueryClient();
  const [sure, setSure] = useState(false);

  const cancel = useMutation({
    mutationFn: () => cancelOrder(order.publicId),
    onSuccess: replaceOrder,
    // Most likely the bar just started on it. Look again so the card shows where it really is.
    onError: () => void queryClient.invalidateQueries({ queryKey: ['order', order.publicId] }),
  });

  if (!sure) {
    return (
      <button type="button" className="text-btn" onClick={() => setSure(true)}>
        Cancel this order
      </button>
    );
  }

  return (
    <div className="cancel-order">
      <p className="soft">Cancel order {order.number}? We won't make it.</p>
      {cancel.isError && (
        <p className="form-error" role="alert">
          {cancelOrderMessage(cancel.error)}
        </p>
      )}
      <button type="button" className="btn" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? 'Cancelling…' : 'Yes, cancel it'}
      </button>
      <button type="button" className="text-btn" onClick={() => setSure(false)} disabled={cancel.isPending}>
        Keep my order
      </button>
    </div>
  );
}

function eyebrow(order: OrderResponse): string {
  switch (order.status) {
    case 'ready':
      return "It's ready for you";
    case 'collected':
      return 'Picked up';
    case 'cancelled':
      return 'Order cancelled';
    default:
      return 'We got your order';
  }
}

function message(order: OrderResponse, pickup: string): string {
  switch (order.status) {
    case 'ready':
      return `${order.name}, your order is ready! Come to the counter, tell us your name, and pay there.`;
    case 'collected':
      return `Enjoy, ${order.name}! Thanks for stopping by.`;
    case 'cancelled':
      return cancelledMessage(order);
    default:
      return `Thanks, ${order.name}! We'll have it ready by ${pickup} and call your name. You pay at the counter.`;
  }
}

function cancelledMessage(order: OrderResponse): string {
  switch (order.cancelReason) {
    case 'customer_request':
      return `You cancelled this order, ${order.name}. No problem. Come back whenever you like.`;
    case 'sold_out':
      return `Sorry, ${order.name}, we ran out of something in your order. Ask us at the counter and we'll sort something out.`;
    case 'no_show':
      return `We held your order, ${order.name}, but it wasn't picked up in time, so we cancelled it.`;
    default:
      return `Sorry, ${order.name}, we had to cancel this order. Please ask us at the counter.`;
  }
}
