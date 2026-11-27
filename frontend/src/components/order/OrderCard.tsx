import { getMenuItem } from '../../data/menu';
import { ORDER_TYPE_LABELS, type PlacedOrder } from '../../lib/orders';
import type { OrderStatus } from '../../lib/orderStatus';
import { describeOptions, formatPeso, lineTotal } from '../../lib/pricing';
import { formatPickup } from '../../lib/time';
import { OrderTracker } from './OrderTracker';

type OrderCardProps = { order: PlacedOrder; status: OrderStatus | null };

export function OrderCard({ order, status }: OrderCardProps) {
  const pickup = formatPickup(order.pickupAt, Date.now());

  return (
    <article className="order-card" aria-label={`Order ${order.number}`}>
      <div className="ticket">
        <p className="eyebrow">{eyebrow(order, status)}</p>
        <p className="ticket-label">Your order number</p>
        <p className="ticket-number num">{order.number}</p>
        <p className="ticket-type">
          {ORDER_TYPE_LABELS[order.orderType]} · ready {pickup}
        </p>
      </div>

      {status && <OrderTracker status={status} />}

      <p className="lead">{message(order, status, pickup)}</p>

      <ul className="receipt">
        {order.lines.map((line) => {
          const item = getMenuItem(line.itemId);
          const options = describeOptions(item, line.options);
          return (
            <li key={line.id}>
              <span>
                {line.quantity} × {item.name}
                {options && <span className="soft small"> · {options}</span>}
                {line.note && <span className="soft small"> · “{line.note}”</span>}
              </span>
              <span className="num">{formatPeso(lineTotal(item, line))}</span>
            </li>
          );
        })}
        <li className="receipt-total">
          <span>You'll pay at the counter</span>
          <span className="num">{formatPeso(order.total)}</span>
        </li>
      </ul>
    </article>
  );
}

function eyebrow(order: PlacedOrder, status: OrderStatus | null): string {
  if (status === 'ready') return "It's ready for you";
  if (status === 'collected') return 'Picked up';
  return order.sent ? 'We got your order' : 'Show this at the counter';
}

function message(order: PlacedOrder, status: OrderStatus | null, pickup: string): string {
  if (status === 'ready') return `${order.name}, your order is ready! Come to the counter, tell us your name, and pay there.`;
  if (status === 'collected') return `Enjoy, ${order.name}! Thanks for stopping by.`;
  if (order.sent) return `Thanks, ${order.name}! We'll have it ready by ${pickup} and call your name. You pay at the counter.`;
  return `Thanks, ${order.name}! Show this number at the counter and we'll make it for ${pickup}. You pay when you pick it up.`;
}
