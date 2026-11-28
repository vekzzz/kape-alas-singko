import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { postOrder } from '../../api/orders';
import { useCart } from '../../cart/useCart';
import { useCatalog } from '../../data/CatalogContext';
import { buildOrderRequest, type OrderResponse, type OrderType } from '../../lib/orders';
import { staleAfter } from '../../lib/orderErrors';
import { formatPeso, type CartLine } from '../../lib/pricing';
import { CartLineItem } from './CartLineItem';
import { MyOrders } from './MyOrders';
import { PickupForm, type PickupDetails } from './PickupForm';

const UNDO_MS = 6000;

type Removed = { line: CartLine; index: number };

type OrderPanelProps = {
  orderType: OrderType;
  startOnOrders: boolean;
  orders: OrderResponse[];
  onPlaced: (order: OrderResponse) => void;
  onClose: () => void;
  onEditLine: (line: CartLine) => void;
};

export function OrderPanel({ orderType, startOnOrders, orders, onPlaced, onClose, onEditLine }: OrderPanelProps) {
  const catalog = useCatalog();
  const queryClient = useQueryClient();
  // One key per distinct order. Retrying the same order reuses it, so the server never makes a second one.
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const { lines, total, dispatch } = useCart();
  const [step, setStep] = useState<'review' | 'pickup'>('review');
  const [showingOrders, setShowingOrders] = useState(startOnOrders);
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
      <span>Took out the {catalog.findItem(removed.line.itemId)?.name ?? 'item'}.</span>
      <button type="button" className="text-btn" onClick={undoRemove}>
        Undo
      </button>
    </div>
  );

  const ordersLink = orders.length > 0 && (
    <div className="pickup">
      <p>{orders.length === 1 ? `You have order ${orders[0]!.number} on the way.` : `You have ${orders.length} orders on the way.`}</p>
      <button type="button" className="text-btn" onClick={() => setShowingOrders(true)}>
        Track {orders.length === 1 ? 'it' : 'them'}
      </button>
    </div>
  );

  const placeOrder = async ({ name, phone, slot }: PickupDetails) => {
    const request = buildOrderRequest(lines, catalog, { orderType, name, phone: phone || null, pickupAt: new Date(slot.pickupAt).toISOString() });
    const body = JSON.stringify(request);
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };

    let order: OrderResponse;
    try {
      order = await postOrder(request, attempt.current.key);
    } catch (error) {
      // The menu or the pickup times on screen are out of date: look again so the customer sees what changed.
      for (const key of staleAfter(error)) void queryClient.invalidateQueries({ queryKey: [key] });
      throw error;
    }
    attempt.current = null;
    onPlaced(order);
    setShowingOrders(true);
    dispatch({ type: 'clear' });
  };

  if (showingOrders && orders.length > 0) {
    return <MyOrders orders={orders} onClose={onClose} />;
  }

  if (lines.length === 0) {
    return (
      <div className="cart">
        <h2 className="head">Your order</h2>
        {undoBar}
        <p className="lead">Nothing here yet. Find something you like and tap Add to my order.</p>
        {!removed && ordersLink}
        <button type="button" className="btn" onClick={onClose}>
          Back to the menu
        </button>
      </div>
    );
  }

  if (step === 'pickup') {
    return <PickupForm orderType={orderType} total={total} onBack={() => setStep('review')} onPlace={placeOrder} />;
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
        <span>Your total</span>
        <span className="num">{formatPeso(total)}</span>
      </div>
      <button type="button" className="btn" onClick={() => setStep('pickup')}>
        Proceed
      </button>
      {ordersLink}
    </div>
  );
}
