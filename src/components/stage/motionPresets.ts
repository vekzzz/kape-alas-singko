import type { Variants } from 'motion/react';

export const EASE_OUT = [0.2, 0.7, 0.1, 1] as const;

/** The product swings in from the side it was swiped towards. `direction` is 1 (next) or -1 (previous). */
export const productVariants: Variants = {
  enter: (direction: number) => ({ x: `${direction * 70}%`, rotate: direction * 24, opacity: 0, scale: 0.7 }),
  centre: { x: '0%', rotate: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: `${direction * -70}%`, rotate: direction * -24, opacity: 0, scale: 0.7 }),
};

export const panelVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  centre: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0 }),
};
