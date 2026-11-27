import type { OrderStatuses } from '../../hooks/useOrderStatus';
import type { PlacedOrder } from '../../lib/orders';
import { MAPS_URL, SHOP_ADDRESS } from '../../lib/shop';
import { OrderCard } from './OrderCard';

type MyOrdersProps = {
  orders: PlacedOrder[];
  statuses: OrderStatuses;
  onClose: () => void;
};

export function MyOrders({ orders, statuses, onClose }: MyOrdersProps) {
  return (
    <div className="cart">
      {orders.length > 1 && <h2 className="head">Your orders</h2>}
      {orders.map((order) => (
        <OrderCard key={order.number} order={order} status={statuses[order.number] ?? null} />
      ))}
      <p className="soft">
        Find us at{' '}
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          {SHOP_ADDRESS}
        </a>
        . Just tell us your name and order number.
      </p>
      <button type="button" className="btn" onClick={onClose}>
        Keep browsing
      </button>
    </div>
  );
}
