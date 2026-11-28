import { useShop } from '../../api/hooks';
import { openStatus } from '../../lib/shop';
import { formatDuration, formatTime } from '../../lib/time';

/** `now` is the current time in milliseconds. */
export function OpenStatus({ now }: { now: number }) {
  const { data: shop } = useShop();
  const status = shop ? openStatus(shop, now) : null;

  let text = 'Checking our hours…';
  if (status?.open) text = `Open now, until ${formatTime(status.closesAt)}`;
  else if (status) text = status.opensIn === null ? 'Closed for now' : `Closed, first pour in ${formatDuration(status.opensIn)}`;

  return (
    <p className="status" aria-live="polite">
      <i className={status?.open ? 'dot on' : 'dot'} />
      {text}
    </p>
  );
}
