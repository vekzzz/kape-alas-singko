import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { MenuItem } from '../../data/menu';
import { formatPeso } from '../../lib/pricing';
import { ProductIcon } from '../product-art/ProductIcon';

type MenuRailProps = {
  items: MenuItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
};

/** The scrolling strip of every product along the bottom of the page. */
export function MenuRail({ items, activeIndex, onSelect, onStep }: MenuRailProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const activeChip = strip?.children[activeIndex] as HTMLElement | undefined;
    if (!strip || !activeChip) return;
    const centred = activeChip.offsetLeft - strip.clientWidth / 2 + activeChip.clientWidth / 2;
    strip.scrollTo({ left: centred, behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <nav className="stage-rail glass" aria-label="Menu">
      <button type="button" className="round" onClick={() => onStep(-1)} aria-label="Previous drink">
        ←
      </button>

      <div className="stage-strip" ref={stripRef} role="group" aria-label="All drinks and pastries">
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button key={item.id} type="button" className={active ? 'chip on' : 'chip'} aria-pressed={active} onClick={() => onSelect(index)}>
              {active && <motion.span layoutId="chip-pill" className="pill" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
              <ProductIcon item={item} size={36} />
              <span>{item.name}</span>
              <span className="chip-price num">{formatPeso(item.price)}</span>
            </button>
          );
        })}
      </div>

      <button type="button" className="round" onClick={() => onStep(1)} aria-label="Next drink">
        →
      </button>
    </nav>
  );
}
