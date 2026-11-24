import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MenuItem } from '../../data/menu';

type Droplet = { angle: number; distance: number; size: number };

const DROPLETS: Droplet[] = [
  { angle: -150, distance: 0.92, size: 30 },
  { angle: -118, distance: 1.08, size: 14 },
  { angle: -78, distance: 0.98, size: 22 },
  { angle: -52, distance: 1.12, size: 12 },
  { angle: -24, distance: 0.95, size: 34 },
  { angle: 12, distance: 0.98, size: 16 },
  { angle: 38, distance: 0.96, size: 24 },
  { angle: 150, distance: 0.97, size: 18 },
  { angle: 176, distance: 0.9, size: 12 },
  { angle: 206, distance: 0.98, size: 26 },
];

export function StageBackdrop({ item }: { item: MenuItem }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const radius = useHalfOfSmallerSide(containerRef);

  return (
    <div className="par back" ref={containerRef}>
      <div className="stage-ring" />
      <motion.div
        key={`disc-${item.id}`}
        className="stage-disc"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
      />
      <AnimatePresence>
        {DROPLETS.map(({ angle, distance, size }, i) => {
          const radians = (angle * Math.PI) / 180;
          const color = i % 3 === 0 ? 'var(--ink)' : item.tone;
          return (
            <motion.span
              key={`${item.id}-${i}`}
              className={Math.sin(radians) > 0.2 ? 'drop low' : 'drop'}
              style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
              initial={{ x: 0, y: radius * 0.2, scale: 0 }}
              animate={{ x: Math.cos(radians) * radius * distance, y: Math.sin(radians) * radius * distance, scale: 1 }}
              exit={{ scale: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 70, damping: 9, delay: 0.12 + i * 0.025 }}
            >
              <span className="drop-float" style={{ background: color, animationDelay: `${i * -0.45}s` }} />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function useHalfOfSmallerSide(ref: RefObject<HTMLElement | null>, initial = 240): number {
  const [radius, setRadius] = useState(initial);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setRadius(Math.min(element.clientWidth, element.clientHeight) / 2));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return radius;
}
