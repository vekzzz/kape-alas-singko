import { animate } from 'motion/react';
import { useEffect, useRef } from 'react';
import { formatPeso } from '../../lib/pricing';

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
