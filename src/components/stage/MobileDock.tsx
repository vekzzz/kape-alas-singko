import { useCart } from '../../cart/useCart';
import type { MenuItem } from '../../data/menu';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { formatPeso } from '../../lib/pricing';

type MobileDockProps = {
  item: MenuItem;
  onOpenCart: () => void;
};

export function MobileDock({ item, onOpenCart }: MobileDockProps) {
  const { itemCount, total } = useCart();
  const { add, justAdded } = useQuickAdd(item);

  return (
    <div className="dock glass">
      {item.soldOut ? (
        <p className="dock-sold strong">Sold out today, sorry!</p>
      ) : (
        <button type="button" className="btn grow" onClick={(event) => add(event.currentTarget)}>
          {justAdded ? 'Added! Another?' : `Add · ${formatPeso(item.price)}`}
        </button>
      )}
      {itemCount > 0 && (
        <button type="button" className="btn dock-order" onClick={onOpenCart} data-cart-button>
          My order <span className="count num">{itemCount}</span>
          <span className="num">{formatPeso(total)}</span>
        </button>
      )}
    </div>
  );
}
