import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useState } from 'react';
import { CartProvider } from './cart/CartProvider';
import { keepCurrent, loadOrders, saveOrders } from './cart/orderHistory';
import { loadOrderType, saveOrderType } from './cart/orderTypeStorage';
import { CustomizeForm } from './components/customize/CustomizeForm';
import { OrderPanel } from './components/order/OrderPanel';
import { OrderPill } from './components/order/OrderPill';
import { MenuStage } from './components/stage/MenuStage';
import { Modal } from './components/ui/Modal';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { getMenuItem, type MenuItem } from './data/menu';
import { useManilaMinutes } from './hooks/useManilaMinutes';
import { useOrderStatuses } from './hooks/useOrderStatus';
import type { OrderType, PlacedOrder } from './lib/orders';
import type { CartLine } from './lib/pricing';
import { alertOrderReady } from './lib/readyAlert';

type Customizing = { item: MenuItem; editing?: CartLine };
type CartView = 'cart' | 'orders';

export default function App() {
  const now = useManilaMinutes();
  const [orderType, setOrderType] = useState<OrderType | null>(() => loadOrderType());
  const [customizing, setCustomizing] = useState<Customizing | null>(null);
  const [cartView, setCartView] = useState<CartView | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>(() => loadOrders());

  const statuses = useOrderStatuses(orders, (order) => alertOrderReady(order.number));
  const ordersOnTheWay = orders.filter((order) => statuses[order.number] !== 'collected');

  const closeCustomize = () => setCustomizing(null);
  const closeCart = () => setCartView(null);

  const finishCustomizing = () => {
    const wasEditingCart = Boolean(customizing?.editing);
    closeCustomize();
    if (wasEditingCart) setCartView('cart');
  };

  const editCartLine = (line: CartLine) => {
    closeCart();
    setCustomizing({ item: getMenuItem(line.itemId), editing: line });
  };

  const chooseOrderType = (type: OrderType) => {
    saveOrderType(type);
    setOrderType(type);
  };

  const addOrder = (order: PlacedOrder) => {
    const next = keepCurrent([order, ...orders]);
    saveOrders(next);
    setOrders(next);
  };

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <AnimatePresence mode="wait" initial={false}>
          {orderType ? (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <MenuStage
                now={now}
                orderType={orderType}
                onChangeOrderType={() => setOrderType(null)}
                onCustomize={(item) => setCustomizing({ item })}
                onOpenCart={() => setCartView('cart')}
              />
            </motion.div>
          ) : (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
              <WelcomeScreen now={now} onChoose={chooseOrderType} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {ordersOnTheWay.length > 0 && cartView === null && customizing === null && (
            <OrderPill orders={ordersOnTheWay} statuses={statuses} onOpen={() => setCartView('orders')} />
          )}
        </AnimatePresence>

        <Modal open={customizing !== null} onClose={closeCustomize} label={customizing ? `Make your ${customizing.item.name}` : 'Make it yours'}>
          {customizing && (
            <CustomizeForm
              key={customizing.editing?.id ?? customizing.item.id}
              item={customizing.item}
              editing={customizing.editing}
              onDone={finishCustomizing}
            />
          )}
        </Modal>

        <Modal open={cartView !== null} onClose={closeCart} label="Your order">
          <OrderPanel
            orderType={orderType ?? 'take-out'}
            startOnOrders={cartView === 'orders'}
            orders={orders}
            statuses={statuses}
            onPlaced={addOrder}
            onClose={closeCart}
            onEditLine={editCartLine}
          />
        </Modal>
      </CartProvider>
    </MotionConfig>
  );
}
