import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { isCustomizable, type MenuItem } from '../../data/menu';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { defaultOptions, describeOptions, formatPeso } from '../../lib/pricing';
import { MAPS_URL, SHOP_ADDRESS, SHOP_HOURS } from '../../lib/shop';
import { OPENING_TIME, formatTime } from '../../lib/time';
import { AnimatedPrice } from './AnimatedPrice';
import { EASE_OUT, panelVariants } from './motionPresets';

type BuyPanelProps = {
  item: MenuItem;
  direction: number;
  onCustomize: (item: MenuItem) => void;
};

export function BuyPanel({ item, direction, onCustomize }: BuyPanelProps) {
  return (
    <div className="stage-buy glass">
      <AnimatePresence custom={direction} initial={false} mode="wait">
        <BuyDetails key={item.id} item={item} direction={direction} onCustomize={onCustomize} />
      </AnimatePresence>
      <p className="pickup">
        Pick it up at{' '}
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          {SHOP_ADDRESS}
        </a>
        . We're open {SHOP_HOURS.charAt(0).toLowerCase() + SHOP_HOURS.slice(1)}, and you pay at the counter.
      </p>
    </div>
  );
}

function BuyDetails({ item, direction, onCustomize }: BuyPanelProps) {
  const isPresent = useIsPresent();
  const { add, justAdded } = useQuickAdd(item);
  const defaults = isCustomizable(item) ? describeOptions(item, defaultOptions(item)) : '';

  return (
    <motion.div
      className="stage-buy-in"
      inert={!isPresent}
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
        <p className="strong">Sorry, we've sold out of this today. It's back tomorrow from {formatTime(OPENING_TIME)}.</p>
      ) : (
        <>
          <div className="stage-actions">
            <button type="button" className="btn quick-add" onClick={(event) => add(event.currentTarget)}>
              {justAdded ? 'Added! Want another?' : 'Add to my order'}
            </button>
            {isCustomizable(item) && (
              <button type="button" className="text-btn" onClick={() => onCustomize(item)}>
                Make it your way
              </button>
            )}
          </div>
          {defaults && <p className="soft small defaults">We make it {defaults.toLowerCase()} unless you say otherwise.</p>}
        </>
      )}
    </motion.div>
  );
}
