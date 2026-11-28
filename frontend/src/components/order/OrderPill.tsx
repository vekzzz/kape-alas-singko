import { motion } from 'motion/react';
import type { OrderResponse, OrderStatus } from '../../lib/orders';
import { formatPickup } from '../../lib/time';

type OrderPillProps = {
  /** Orders still on the way: not collected, not cancelled. */
  orders: OrderResponse[];
  onOpen: () => void;
};

const STATUS_LINES: Record<Exclude<OrderStatus, 'collected' | 'cancelled'>, string> = {
  received: "We've got it",
  preparing: "We're making it now",
  ready: "It's ready, come grab it!",
};

export function OrderPill({ orders, onOpen }: OrderPillProps) {
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const latest = orders[0]!;
  const latestStatus = latest.status;

  let title: string;
  let line: string;
  if (orders.length === 1) {
    title = `Order ${latest.number}`;
    line = latestStatus !== 'collected' && latestStatus !== 'cancelled' ? STATUS_LINES[latestStatus] : `Ready ${formatPickup(Date.parse(latest.pickupAt), Date.now())}`;
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
