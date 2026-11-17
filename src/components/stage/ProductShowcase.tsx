import { AnimatePresence, motion } from 'motion/react';
import type { MenuItem } from '../../data/menu';
import { defaultOptions } from '../../lib/pricing';
import { ProductArt } from '../product-art/ProductArt';
import { productVariants } from './motionPresets';

const SWIPE_THRESHOLD = 70;

type ProductShowcaseProps = {
  item: MenuItem;
  direction: number;
  onSwipe: (direction: 1 | -1) => void;
};

/** The big product in the middle. Drag it sideways to move through the menu. */
export function ProductShowcase({ item, direction, onSwipe }: ProductShowcaseProps) {
  return (
    <div className="par front">
      <AnimatePresence custom={direction} mode="popLayout">
        <motion.div
          key={item.id}
          className="stage-drink"
          custom={direction}
          variants={productVariants}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          whileDrag={{ scale: 1.05, rotate: 4 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD) onSwipe(1);
            else if (info.offset.x > SWIPE_THRESHOLD) onSwipe(-1);
          }}
        >
          <div className="bob">
            <ProductArt item={item} options={defaultOptions(item)} steaming />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
