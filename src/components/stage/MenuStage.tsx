import { useEffect, useEffectEvent, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { sortedMenu, type MenuItem } from '../../data/menu';
import { BuyPanel } from './BuyPanel';
import { ItemTitle } from './ItemTitle';
import { MenuRail } from './MenuRail';
import { MobileDock } from './MobileDock';
import { ProductShowcase } from './ProductShowcase';
import { StageBackdrop } from './StageBackdrop';
import { stageColorsFor } from './stageColors';
import { StageHeader } from './StageHeader';

const WHEEL_COOLDOWN_MS = 650;
const MIN_WHEEL_DELTA = 30;

type MenuStageProps = {
  now: number;
  onCustomize: (item: MenuItem) => void;
  onOpenCart: () => void;
};

export function MenuStage({ now, onCustomize, onOpenCart }: MenuStageProps) {
  const hour = Math.floor(now / 60);
  const items = useMemo(() => sortedMenu(hour * 60), [hour]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const stageRef = useRef<HTMLElement>(null);
  const wheelLockedUntil = useRef(0);

  const item = items[activeIndex];

  const goTo = (index: number, towards: 1 | -1) => {
    setDirection(towards);
    setActiveIndex((index + items.length) % items.length);
  };
  const step = (towards: 1 | -1) => goTo(activeIndex + towards, towards);

  usePageColors(item.id);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleWheel = (event: WheelEvent) => {
    const horizontal = Math.abs(event.deltaX) >= MIN_WHEEL_DELTA && Math.abs(event.deltaX) >= Math.abs(event.deltaY);
    if (!horizontal || Date.now() < wheelLockedUntil.current) return;
    wheelLockedUntil.current = Date.now() + WHEEL_COOLDOWN_MS;
    step(event.deltaX > 0 ? 1 : -1);
  };

  const pendingPointer = useRef<{ x: number; y: number } | null>(null);
  const pointerFrame = useRef(0);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    pendingPointer.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      const stage = stageRef.current;
      const point = pendingPointer.current;
      if (!stage || !point) return;
      const bounds = stage.getBoundingClientRect();
      stage.style.setProperty('--px', String(((point.x - bounds.left) / bounds.width) * 2 - 1));
      stage.style.setProperty('--py', String(((point.y - bounds.top) / bounds.height) * 2 - 1));
    });
  };

  const resetParallax = () => {
    pendingPointer.current = null;
    stageRef.current?.style.setProperty('--px', '0');
    stageRef.current?.style.setProperty('--py', '0');
  };

  return (
    <main id="top" ref={stageRef} className="stage" onPointerMove={handlePointerMove} onPointerLeave={resetParallax} onWheel={handleWheel}>
      <div className="orbs" aria-hidden="true">
        <i style={{ background: item.tone }} />
        <i />
        <i style={{ background: item.tone }} />
      </div>

      <StageHeader now={now} onOpenCart={onOpenCart} />
      <ItemTitle item={item} />

      <div className="stage-cup">
        <StageBackdrop item={item} />
        <ProductShowcase item={item} direction={direction} onSwipe={step} />
      </div>

      <BuyPanel item={item} direction={direction} onCustomize={onCustomize} />
      <MenuRail items={items} activeIndex={activeIndex} onSelect={(index) => goTo(index, index >= activeIndex ? 1 : -1)} onStep={step} />
      <MobileDock item={item} onOpenCart={onOpenCart} />
    </main>
  );
}

function usePageColors(itemId: string) {
  const { background, ink } = stageColorsFor(itemId);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--bg', background);
    root.setProperty('--ink', ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, [background, ink]);
}
