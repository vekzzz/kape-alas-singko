import { AnimatePresence, motion } from 'motion/react';
import { useCatalog } from '../../data/CatalogContext';
import type { MenuItem } from '../../data/menu';
import { EASE_OUT } from './motionPresets';
import { splitName } from './splitName';

export function ItemTitle({ item }: { item: MenuItem }) {
  const catalog = useCatalog();

  return (
    <div className="stage-name" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.h2 key={item.id} className="stage-title" aria-label={item.name}>
          {splitName(item.name).map((line, i) => (
            <span key={line} className="line" aria-hidden="true">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-110%' }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: i * 0.06 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>
      </AnimatePresence>
      <p className="stage-group">{catalog.getGroup(item.group).name}</p>
    </div>
  );
}
