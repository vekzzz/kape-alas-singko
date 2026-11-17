import { MotionConfig } from 'motion/react';
import { useState } from 'react';
import { CartProvider } from './cart/CartProvider';
import { CustomizeForm } from './components/customize/CustomizeForm';
import { OrderPanel } from './components/order/OrderPanel';
import { MenuStage } from './components/stage/MenuStage';
import { Modal } from './components/ui/Modal';
import { getMenuItem, type MenuItem } from './data/menu';
import { useManilaMinutes } from './hooks/useManilaMinutes';
import type { CartLine } from './lib/pricing';

type Customizing = { item: MenuItem; editing?: CartLine };

export default function App() {
  const now = useManilaMinutes();
  const [customizing, setCustomizing] = useState<Customizing | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const closeCustomize = () => setCustomizing(null);
  const closeCart = () => setCartOpen(false);

  const finishCustomizing = () => {
    const wasEditingCart = Boolean(customizing?.editing);
    closeCustomize();
    if (wasEditingCart) setCartOpen(true);
  };

  const editCartLine = (line: CartLine) => {
    closeCart();
    setCustomizing({ item: getMenuItem(line.itemId), editing: line });
  };

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <MenuStage now={now} onCustomize={(item) => setCustomizing({ item })} onOpenCart={() => setCartOpen(true)} />

        <Modal open={customizing !== null} onClose={closeCustomize} label={customizing ? `Build your ${customizing.item.name}` : 'Build your cup'}>
          {customizing && (
            <CustomizeForm
              key={customizing.editing?.id ?? customizing.item.id}
              item={customizing.item}
              editing={customizing.editing}
              onDone={finishCustomizing}
            />
          )}
        </Modal>

        <Modal open={cartOpen} onClose={closeCart} label="Your order">
          <OrderPanel onClose={closeCart} onEditLine={editCartLine} />
        </Modal>
      </CartProvider>
    </MotionConfig>
  );
}
