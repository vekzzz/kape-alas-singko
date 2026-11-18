import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { loadLastOrder, saveLastOrder } from '../../cart/lastOrderStorage';
import { useCart } from '../../cart/useCart';
import { getMenuItem } from '../../data/menu';
import { newOrderNumber, sendOrder, type PlacedOrder } from '../../lib/orders';
import { pickupTimestamp } from '../../lib/pickupSlots';
import { formatPeso, type CartLine } from '../../lib/pricing';
import { formatPickup } from '../../lib/time';
import { CartLineItem } from './CartLineItem';
import { OrderConfirmation } from './OrderConfirmation';
import { PickupForm, type PickupDetails } from './PickupForm';

const UNDO_MS = 6000;

type Removed = { line: CartLine; index: number };

type OrderPanelProps = {
  onClose: () => void;
  onEditLine: (line: CartLine) => void;
};

export function OrderPanel({ onClose, onEditLine }: OrderPanelProps) {
  const { lines, total, dispatch } = useCart();
  const [step, setStep] = useState<'review' | 'pickup'>('review');
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [lastOrder] = useState(() => loadLastOrder());
  const [removed, setRemoved] = useState<Removed | null>(null);

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const removeLine = (line: CartLine) => {
    setRemoved({ line, index: lines.indexOf(line) });
    dispatch({ type: 'remove', id: line.id });
  };

  const undoRemove = () => {
    if (!removed) return;
    dispatch({ type: 'restore', ...removed });
    setRemoved(null);
  };

  const undoBar = removed && (
    <div className="undo" role="status">
      <span>Removed {getMenuItem(removed.line.itemId).name}.</span>
      <button type="button" className="text-btn" onClick={undoRemove}>
        Undo
      </button>
    </div>
  );

  const placeOrder = async ({ name, phone, slot }: PickupDetails) => {
    const now = new Date();
    const order: PlacedOrder = {
      number: newOrderNumber(),
      name,
      phone,
      pickupAt: pickupTimestamp(slot, now),
      placedAt: now.getTime(),
      lines,
      total,
      sent: false,
    };
    // Throws on a network or server error; PickupForm shows it and the cart stays as it is.
    const result = await sendOrder(order);
    const placed = { ...order, sent: result.sent, number: (result.sent && result.number) || order.number };
    saveLastOrder(placed);
    setPlacedOrder(placed);
    dispatch({ type: 'clear' });
  };

  if (placedOrder) {
    return <OrderConfirmation order={placedOrder} onClose={onClose} />;
  }

  if (lines.length === 0) {
    return (
      <div className="cart">
        <h2 className="head">Your order</h2>
        {undoBar}
        {lastOrder && !removed ? (
          <div className="pickup">
            <p>
              Order <strong className="num nowrap">{lastOrder.number}</strong> for {formatPickup(lastOrder.pickupAt, Date.now())}.
            </p>
            <button type="button" className="text-btn" onClick={() => setPlacedOrder(lastOrder)}>
              Show my order
            </button>
          </div>
        ) : (
          <p className="lead">Nothing here yet. Pick a coffee and it lands in this list.</p>
        )}
        <button type="button" className="btn" onClick={onClose}>
          See the menu
        </button>
      </div>
    );
  }

  if (step === 'pickup') {
    return <PickupForm total={total} onBack={() => setStep('review')} onPlace={placeOrder} />;
  }

  return (
    <div className="cart">
      <h2 className="head">Your order</h2>
      {undoBar}
      <ul className="cart-lines">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <CartLineItem key={line.id} line={line} onEdit={() => onEditLine(line)} onRemove={() => removeLine(line)} />
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
