import { motion } from 'motion/react';
import type { OrderStatuses } from '../../hooks/useOrderStatus';
import type { PlacedOrder } from '../../lib/orders';
import type { OrderStatus } from '../../lib/orderStatus';
import { formatPickup } from '../../lib/time';

type OrderPillProps = {
  orders: PlacedOrder[];
  statuses: OrderStatuses;
  onOpen: () => void;
};

const STATUS_LINES: Record<Exclude<OrderStatus, 'collected'>, string> = {
  received: "We've got it",
  preparing: "We're making it now",
  ready: "It's ready, come grab it!",
};

export function OrderPill({ orders, statuses, onOpen }: OrderPillProps) {
  const readyCount = orders.filter((order) => statuses[order.number] === 'ready').length;
  const latest = orders[0]!;
  const latestStatus = statuses[latest.number];

  let title: string;
  let line: string;
  if (orders.length === 1) {
    title = `Order ${latest.number}`;
    line = latestStatus && latestStatus !== 'collected' ? STATUS_LINES[latestStatus] : `Ready ${formatPickup(latest.pickupAt, Date.now())}`;
  } else {
    title = `${orders.length} orders`;
    line = readyCount > 0 ? `${readyCount} ready, come grab ${readyCount === 1 ? 'it' : 'them'}!` : "We're on them";
  }

  return (
    <motion.button
      type="button"
      className={readyCount > 0 ? 'order-pill ready' : 'order-pill'}
      onClick={onOpen}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      aria-live="polite"
    >
      <span className="order-pill-dot" aria-hidden="true" />
      <span className="order-pill-text">
        <strong className="num">{title}</strong>
        <span>{line}</span>
      </span>
      <span className="order-pill-go">Track</span>
    </motion.button>
  );
}
