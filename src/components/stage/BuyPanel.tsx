import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useCart } from '../../cart/useCart';
import { isCustomizable, type MenuItem } from '../../data/menu';
import { flyToCart } from '../../lib/flyToCart';
import { defaultOptions, formatPeso } from '../../lib/pricing';
import { AnimatedPrice } from './AnimatedPrice';
import { EASE_OUT, panelVariants } from './motionPresets';

const ADDED_MESSAGE_MS = 1400;

type BuyPanelProps = {
  item: MenuItem;
  direction: number;
  onCustomize: (item: MenuItem) => void;
};

export function BuyPanel({ item, direction, onCustomize }: BuyPanelProps) {
  const { dispatch } = useCart();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!justAddedId) return;
    const timer = setTimeout(() => setJustAddedId(null), ADDED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [justAddedId]);

  const addToOrder = (button: HTMLButtonElement) => {
    dispatch({ type: 'add', itemId: item.id, options: defaultOptions(item), note: '', quantity: 1 });
    flyToCart(button);
    setJustAddedId(item.id);
  };

  return (
    <div className="stage-buy glass">
      <AnimatePresence custom={direction} initial={false} mode="wait">
        <motion.div
          key={item.id}
          className="stage-buy-in"
          custom={direction}
          variants={panelVariants}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <p className="stage-price num" aria-label={formatPeso(item.price)}>
            <AnimatedPrice value={item.price} />
          </p>
          <p>{item.description}</p>
          {item.note && <p className="strong">{item.note}</p>}

          {item.soldOut ? (
            <p className="strong">Sold out today. Back tomorrow at five.</p>
          ) : (
            <div className="stage-actions">
              <button type="button" className="btn" onClick={(event) => addToOrder(event.currentTarget)}>
                {justAddedId === item.id ? 'Added, one more?' : 'Add to order'}
              </button>
              {isCustomizable(item) && (
                <button type="button" className="text-btn" onClick={() => onCustomize(item)}>
                  Size, milk, shots
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <p className="pickup">Pick up at Magsaysay Avenue, Naga City, Camarines Sur. Every day, 5:00 AM to 9:00 PM. Pay at the counter.</p>
    </div>
  );
}
