import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useMenu } from './api/hooks';
import { useCartStore } from './cart/cartStore';
import { useOrderStore } from './cart/orderStore';
import { useOrderTypeStore } from './cart/orderTypeStore';
import { CustomizeForm } from './components/customize/CustomizeForm';
import { OrderPanel } from './components/order/OrderPanel';
import { OrderPill } from './components/order/OrderPill';
import { MenuStage } from './components/stage/MenuStage';
import { Modal } from './components/ui/Modal';
import { RequireCatalog } from './components/ui/RequireCatalog';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { CatalogContext } from './data/CatalogContext';
import type { MenuItem } from './data/menu';
import { useNow } from './hooks/useNow';
import { useOrderTracking } from './hooks/useOrderTracking';
import { isFinished } from './lib/orders';
import type { CartLine } from './lib/pricing';
import { alertOrderReady } from './lib/readyAlert';

type Customizing = { item: MenuItem; editing?: CartLine };
type CartView = 'cart' | 'orders';

export default function App() {
  const now = useNow();
  const catalog = useMenu().data ?? null;
  const orderType = useOrderTypeStore((state) => state.orderType);
  const setOrderType = useOrderTypeStore((state) => state.setOrderType);
  const orders = useOrderStore((state) => state.orders);
  const addOrder = useOrderStore((state) => state.addOrder);
  const keepOnly = useCartStore((state) => state.keepOnly);
  const [customizing, setCustomizing] = useState<Customizing | null>(null);
  const [cartView, setCartView] = useState<CartView | null>(null);

  useOrderTracking((order) => alertOrderReady(order.number));
  const ordersOnTheWay = orders.filter((order) => !isFinished(order));

  // A saved cart can hold something that has since been taken off the menu or sold out.
  useEffect(() => {
    if (!catalog) return;
    keepOnly((line) => {
      const item = catalog.findItem(line.itemId);
      return item !== undefined && !item.soldOut;
    });
  }, [catalog, keepOnly]);

  const closeCustomize = () => setCustomizing(null);
  const closeCart = () => setCartView(null);

  const finishCustomizing = () => {
    const wasEditingCart = Boolean(customizing?.editing);
    closeCustomize();
    if (wasEditingCart) setCartView('cart');
  };

  const editCartLine = (line: CartLine) => {
    const item = catalog?.findItem(line.itemId);
    if (!item) return;
    closeCart();
    setCustomizing({ item, editing: line });
  };

  return (
    <MotionConfig reducedMotion="user">
      <CatalogContext value={catalog}>
        <AnimatePresence mode="wait" initial={false}>
          {orderType ? (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <RequireCatalog>
                <MenuStage
                  now={now}
                  orderType={orderType}
                  onChangeOrderType={() => setOrderType(null)}
                  onCustomize={(item) => setCustomizing({ item })}
                  onOpenCart={() => setCartView('cart')}
                />
              </RequireCatalog>
            </motion.div>
          ) : (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
              <WelcomeScreen now={now} onChoose={setOrderType} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {ordersOnTheWay.length > 0 && cartView === null && customizing === null && (
            <OrderPill orders={ordersOnTheWay} onOpen={() => setCartView('orders')} />
          )}
        </AnimatePresence>

        <Modal open={customizing !== null} onClose={closeCustomize} label={customizing ? `Make your ${customizing.item.name}` : 'Make it yours'}>
          {customizing && (
            <RequireCatalog>
              <CustomizeForm
                key={customizing.editing?.id ?? customizing.item.id}
                item={customizing.item}
                editing={customizing.editing}
                onDone={finishCustomizing}
              />
            </RequireCatalog>
          )}
        </Modal>

        <Modal open={cartView !== null} onClose={closeCart} label="Your order">
          <RequireCatalog>
            <OrderPanel
              orderType={orderType ?? 'take-out'}
              startOnOrders={cartView === 'orders'}
              orders={orders}
              onPlaced={addOrder}
              onClose={closeCart}
              onEditLine={editCartLine}
            />
          </RequireCatalog>
        </Modal>
      </CatalogContext>
    </MotionConfig>
  );
}
