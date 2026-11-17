import { getMenuItem } from '../../data/menu';
import { formatPeso, lineTotal, type CartLine } from '../../lib/pricing';

export type PlacedOrder = {
  number: string;
  name: string;
  pickupLabel: string;
  lines: CartLine[];
  total: number;
};

export function OrderConfirmation({ order, onClose }: { order: PlacedOrder; onClose: () => void }) {
  return (
    <div className="cart">
      <h2 className="head">Order {order.number} is in</h2>
      <p className="lead">
        {order.name}, your order will be on the counter at {order.pickupLabel}. Pay when you pick it up.
      </p>

      <ul className="receipt">
        {order.lines.map((line) => {
          const item = getMenuItem(line.itemId);
          return (
            <li key={line.id}>
              <span>
                {line.quantity} × {item.name}
              </span>
              <span className="num">{formatPeso(lineTotal(item, line))}</span>
            </li>
          );
        })}
        <li className="receipt-total">
          <span>To pay at the counter</span>
          <span className="num">{formatPeso(order.total)}</span>
        </li>
      </ul>

      <p className="soft">Magsaysay Avenue, Naga City. Tell us your name and the order number.</p>
      <button type="button" className="btn" onClick={onClose}>
        Back to the menu
      </button>
    </div>
  );
}
