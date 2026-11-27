import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { getMenuGroup, type MenuGroupId, type MenuItem } from '../../data/menu';
import { formatPeso } from '../../lib/pricing';
import { ProductIcon } from '../product-art/ProductIcon';

type MenuRailProps = {
  items: MenuItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onStep: (direction: 1 | -1) => void;
};

const TAB_NAMES: Record<MenuGroupId, string> = { espresso: 'Espresso', slow: 'Slow bar', cold: 'Cold', bakery: 'Bakery' };

export function MenuRail({ items, activeIndex, onSelect, onStep }: MenuRailProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeGroup = items[activeIndex]?.group;
  const groups = items.reduce<{ id: MenuGroupId; first: number }[]>((found, item, index) => {
    if (!found.some((group) => group.id === item.group)) found.push({ id: item.group, first: index });
    return found;
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    const activeChip = strip?.children[activeIndex] as HTMLElement | undefined;
    if (!strip || !activeChip) return;
    const centred = activeChip.offsetLeft - strip.clientWidth / 2 + activeChip.clientWidth / 2;
    strip.scrollTo({ left: centred, behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <nav className="stage-rail glass" aria-label="Menu">
      <div className="rail-tabs" role="group" aria-label="Jump to a section">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={group.id === activeGroup ? 'rail-tab on' : 'rail-tab'}
            aria-pressed={group.id === activeGroup}
            aria-label={getMenuGroup(group.id).name}
            onClick={() => onSelect(group.first)}
          >
            {TAB_NAMES[group.id]}
          </button>
        ))}
      </div>

      <div className="rail-row">
        <button type="button" className="round" onClick={() => onStep(-1)} aria-label="Previous item">
          ←
        </button>

        <div className="stage-strip" ref={stripRef} role="group" aria-label="All drinks and pastries">
          {items.map((item, index) => {
            const active = index === activeIndex;
            const className = ['chip', active && 'on', item.soldOut && 'sold'].filter(Boolean).join(' ');
            return (
              <button key={item.id} type="button" className={className} aria-pressed={active} onClick={() => onSelect(index)}>
                {active && <motion.span layoutId="chip-pill" className="pill" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                <ProductIcon item={item} size={36} />
                <span>{item.name}</span>
                <span className="chip-price num">{item.soldOut ? 'Sold out' : formatPeso(item.price)}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="round" onClick={() => onStep(1)} aria-label="Next item">
          →
        </button>
      </div>
    </nav>
  );
}
