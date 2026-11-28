import { useId, useState } from 'react';
import type { OrderStatus } from '../../lib/orders';
import { notificationsSupported } from '../../lib/readyAlert';

/** The steps an order moves through. A cancelled order leaves them, so it has its own screen. */
type Step = Exclude<OrderStatus, 'cancelled'>;
const STEPS: Step[] = ['received', 'preparing', 'ready', 'collected'];

const STEP_LABELS: Record<Step, string> = {
  received: 'Order received',
  preparing: 'Being made',
  ready: 'Ready for you',
  collected: 'Picked up',
};

const MESSAGES: Record<Step, string> = {
  received: "We've got your order!",
  preparing: 'Our barista is making it now.',
  ready: "It's ready! Come grab it at the counter.",
  collected: 'Picked up. Enjoy!',
};

export function OrderTracker({ status }: { status: Step }) {
  const current = STEPS.indexOf(status);
  const headingId = useId();

  return (
    <section className={status === 'ready' ? 'tracker ready' : 'tracker'} aria-labelledby={headingId}>
      <h3 id={headingId} className="visually-hidden">
        Where your order is
      </h3>
      <p className="tracker-message" role="status">
        {MESSAGES[status]}
      </p>
      <ol className="tracker-steps">
        {STEPS.map((step, index) => (
          <li key={step} className={index < current ? 'past' : index === current ? 'on' : undefined} aria-current={index === current ? 'step' : undefined}>
            <span className="tracker-dot" />
            <span>{STEP_LABELS[step]}</span>
          </li>
        ))}
      </ol>
      {(status === 'received' || status === 'preparing') && <NotifyOption />}
    </section>
  );
}

function NotifyOption() {
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'));

  if (permission === 'granted') return <p className="soft small">We'll send you a notification when it's ready. Just keep this page open.</p>;
  if (permission !== 'default') return <p className="soft small">Keep this page open and we'll chime when it's ready.</p>;

  return (
    <button type="button" className="btn ghost" onClick={async () => setPermission(await Notification.requestPermission())}>
      Let me know when it's ready
    </button>
  );
}
