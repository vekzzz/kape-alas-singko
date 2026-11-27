const DOT_SIZE = 28;

export function flyToCart(from: Element | null) {
  const cartButton = visibleCartButton();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!from || !cartButton || reducedMotion) return;

  const start = from.getBoundingClientRect();
  const end = cartButton.getBoundingClientRect();
  const startX = start.left + start.width / 2;
  const startY = start.top + start.height / 2;
  const dx = end.left + end.width / 2 - startX;
  const dy = end.top + end.height / 2 - startY;

  const dot = document.createElement('span');
  dot.className = 'fly-dot';
  dot.style.left = `${startX - DOT_SIZE / 2}px`;
  dot.style.top = `${startY - DOT_SIZE / 2}px`;
  document.body.appendChild(dot);

  const flight = dot.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(1.3)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)` },
    ],
    { duration: 650, easing: 'cubic-bezier(.3,.7,.2,1)' },
  );

  flight.finished.then(() => {
    dot.remove();
    cartButton.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320 });
  });
}

function visibleCartButton(): Element | null {
  const buttons = [...document.querySelectorAll('[data-cart-button]')];
  const onScreen = buttons.find((button) => {
    const box = button.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
  });
  return onScreen ?? null;
}
