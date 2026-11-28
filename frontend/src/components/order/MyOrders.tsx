import { useShop } from '../../api/hooks';
import type { OrderStatuses } from '../../hooks/useOrderStatus';
import type { PlacedOrder } from '../../lib/orders';
import { mapsUrl } from '../../lib/shop';
import { OrderCard } from './OrderCard';

type MyOrdersProps = {
  orders: PlacedOrder[];
  statuses: OrderStatuses;
  onClose: () => void;
};

export function MyOrders({ orders, statuses, onClose }: MyOrdersProps) {
  const { data: shop } = useShop();

  return (
    <div className="cart">
      {orders.length > 1 && <h2 className="head">Your orders</h2>}
      {orders.map((order) => (
        <OrderCard key={order.number} order={order} status={statuses[order.number] ?? null} />
      ))}
      {shop ? (
        <p className="soft">
          Find us at{' '}
          <a href={mapsUrl(shop)} target="_blank" rel="noopener noreferrer">
            {shop.address}
          </a>
          . Just tell us your name and order number.
        </p>
      ) : (
        <p className="soft">Just tell us your name and order number at the counter.</p>
      )}
      <button type="button" className="btn" onClick={onClose}>
        Keep browsing
      </button>
    </div>
  );
}
