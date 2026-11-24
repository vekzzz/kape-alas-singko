import { getMenuItem } from '../../data/menu';
import type { PlacedOrder } from '../../lib/orders';
import { describeOptions, formatPeso, lineTotal } from '../../lib/pricing';
import { MAPS_URL, SHOP_ADDRESS } from '../../lib/shop';
import { formatPickup } from '../../lib/time';

export function OrderConfirmation({ order, onClose }: { order: PlacedOrder; onClose: () => void }) {
  const pickup = formatPickup(order.pickupAt, Date.now());

  return (
    <div className="cart">
      {order.sent ? (
        <>
          <h2 className="head">
            Order <span className="nowrap">{order.number}</span> is in
          </h2>
          <p className="lead">
            {order.name}, your order will be on the counter at {pickup}. Pay when you pick it up.
          </p>
        </>
      ) : (
        <>
          <h2 className="head">
            Order <span className="nowrap">{order.number}</span>
          </h2>
          <p className="lead">
            {order.name}, show this screen at the counter and we'll make it for {pickup}. Pay when you pick it up.
          </p>
        </>
      )}

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
          <span>To pay at the counter</span>
          <span className="num">{formatPeso(order.total)}</span>
        </li>
      </ul>

      <p className="soft">
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          {SHOP_ADDRESS}
        </a>
        . Tell us your name and the order number.
      </p>
      <button type="button" className="btn" onClick={onClose}>
        Back to the menu
      </button>
    </div>
  );
}
