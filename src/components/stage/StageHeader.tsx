import { useCart } from '../../cart/useCart';
import { CLOSING_TIME, formatDuration, formatTime, isOpen, minutesUntilOpen } from '../../lib/time';

export function StageHeader({ now, onOpenCart }: { now: number; onOpenCart: () => void }) {
  const { itemCount } = useCart();
  const open = isOpen(now);
  const status = open ? `Open now, until ${formatTime(CLOSING_TIME)}` : `Closed, first pour in ${formatDuration(minutesUntilOpen(now))}`;

  return (
    <header className="bar glass">
      <h1 className="brand">
        <span className="wordmark">Kapé Alas-Singko</span>{' '}
        <span className="brand-line" lang="bcl">
          Kapihan sa Magsaysay, Naga
        </span>
      </h1>
      <p className="status" aria-live="polite">
        <i className={open ? 'dot on' : 'dot'} />
        {status}
      </p>
      <button type="button" className="btn cart-btn" onClick={onOpenCart} data-cart-button>
        Order <span className="count num">{itemCount}</span>
      </button>
    </header>
  );
}
