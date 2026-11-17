import { animate } from 'motion/react';
import { useEffect, useRef } from 'react';
import { formatPeso } from '../../lib/pricing';

/** Counts from the previous price to the new one. Screen readers get the final value from the parent's label. */
export function AnimatedPrice({ value }: { value: number }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const previousValue = useRef(value);

  useEffect(() => {
    const animation = animate(previousValue.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (current) => {
        if (textRef.current) textRef.current.textContent = formatPeso(Math.round(current));
      },
    });
    previousValue.current = value;
    return () => animation.stop();
  }, [value]);

  return (
    <span ref={textRef} aria-hidden="true">
      {formatPeso(value)}
    </span>
  );
}
