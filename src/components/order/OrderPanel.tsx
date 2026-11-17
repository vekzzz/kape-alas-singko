import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useCart } from '../../cart/useCart';
import { formatPeso, type CartLine } from '../../lib/pricing';
import { CartLineItem } from './CartLineItem';
import { OrderConfirmation, type PlacedOrder } from './OrderConfirmation';
import { PickupForm } from './PickupForm';

type OrderPanelProps = {
  onClose: () => void;
  onEditLine: (line: CartLine) => void;
};

export function OrderPanel({ onClose, onEditLine }: OrderPanelProps) {
  const { lines, total, dispatch } = useCart();
  const [step, setStep] = useState<'review' | 'pickup'>('review');
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);

  if (placedOrder) {
    return <OrderConfirmation order={placedOrder} onClose={onClose} />;
  }

  if (lines.length === 0) {
    return (
      <div className="cart">
        <h2 className="head">Your order</h2>
        <p className="lead">Nothing here yet. Pick a coffee and it lands in this list.</p>
        <button type="button" className="btn" onClick={onClose}>
          See the menu
        </button>
      </div>
    );
  }

  if (step === 'pickup') {
    return (
      <PickupForm
        total={total}
        onBack={() => setStep('review')}
        onPlace={({ name, pickupLabel }) => {
          setPlacedOrder({ number: newOrderNumber(), name, pickupLabel, lines, total });
          dispatch({ type: 'clear' });
        }}
      />
    );
  }

  return (
    <div className="cart">
      <h2 className="head">Your order</h2>
      <ul className="cart-lines">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <CartLineItem key={line.id} line={line} onEdit={() => onEditLine(line)} />
          ))}
        </AnimatePresence>
      </ul>
      <div className="cart-sum">
        <span>Subtotal</span>
        <span className="num">{formatPeso(total)}</span>
      </div>
      <button type="button" className="btn" onClick={() => setStep('pickup')}>
        Continue to pickup
      </button>
    </div>
  );
}

/** Short enough to say out loud at the counter, e.g. "A5-042". */
function newOrderNumber(): string {
  const suffix = Math.floor(Date.now() / 1000) % 1000;
  return `A5-${String(suffix).padStart(3, '0')}`;
}
