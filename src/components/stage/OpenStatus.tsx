import { CLOSING_TIME, formatDuration, formatTime, isOpen, minutesUntilOpen } from '../../lib/time';

export function OpenStatus({ now }: { now: number }) {
  const open = isOpen(now);
  const status = open ? `Open now, until ${formatTime(CLOSING_TIME)}` : `Closed, first pour in ${formatDuration(minutesUntilOpen(now))}`;

  return (
    <p className="status" aria-live="polite">
      <i className={open ? 'dot on' : 'dot'} />
      {status}
    </p>
  );
}
