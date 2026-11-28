import { useCart } from '../../cart/useCart';
import { ORDER_TYPE_LABELS, type OrderType } from '../../lib/orders';
import { OpenStatus } from './OpenStatus';

type StageHeaderProps = {
  /** Current time in milliseconds. */
  now: number;
  orderType: OrderType;
  onChangeOrderType: () => void;
  onOpenCart: () => void;
};

export function StageHeader({ now, orderType, onChangeOrderType, onOpenCart }: StageHeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="bar glass">
      <h1 className="brand">
        <span className="wordmark">Kapé Alas-Singko</span>{' '}
        <span className="brand-line" lang="bcl">
          Kapihan sa Magsaysay, Naga
        </span>
      </h1>
      <OpenStatus now={now} />
      <button type="button" className="type-chip" onClick={onChangeOrderType} aria-label={`${ORDER_TYPE_LABELS[orderType]}. Change`}>
        {ORDER_TYPE_LABELS[orderType]}
        <span className="type-chip-change">Change</span>
      </button>
      <button type="button" className="btn cart-btn" onClick={onOpenCart} data-cart-button>
        My order <span className="count num">{itemCount}</span>
      </button>
    </header>
  );
}
