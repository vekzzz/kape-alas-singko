import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { logoutStaff } from '../api/staff';
import { useNow } from '../hooks/useNow';
import { formatTime, manilaMinutes } from '../lib/time';
import { groupOrders } from './boardData';
import { OrderTicket } from './OrderTicket';
import { PauseOrders, SoldOutPanel } from './ShopControls';
import { useSessionStore } from './sessionStore';
import { playNewOrderChime, soundReady, unlockAudio } from './staffAlert';
import { BOARD_KEY, useBoard, useNewOrderAlert } from './useBoard';
import { useOrderActions } from './useOrderActions';

const COLUMNS = [
  { key: 'received', title: 'New', empty: 'No new orders' },
  { key: 'preparing', title: 'Making', empty: 'Nothing on the machine' },
  { key: 'ready', title: 'Ready', empty: 'Nothing waiting on the counter' },
] as const;

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
}

export function Board() {
  const staff = useSessionStore((state) => state.staff);
  const token = useSessionStore((state) => state.token);
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const board = useBoard();
  const now = useNow();
  const [started, setStarted] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7_000);
    return () => clearTimeout(timer);
  }, [toast]);

  useNewOrderAlert(board.data?.orders);
  const actions = useOrderActions(notify);
  const columns = useMemo(() => groupOrders(board.data?.orders ?? []), [board.data?.orders]);

  const startShift = async () => {
    const allowed = await unlockAudio();
    if (allowed) playNewOrderChime();
    else notify("Couldn't turn the sound on. Tap Test sound, or check the volume.");
    setStarted(true);
  };

  const leave = () => {
    if (token) void logoutStaff(token).catch(() => undefined);
    queryClient.removeQueries({ queryKey: BOARD_KEY });
    signOut();
  };

  const lastUpdate = board.dataUpdatedAt ? formatTime(manilaMinutes(new Date(board.dataUpdatedAt))) : null;
  const offline = board.isError && board.data !== undefined;

  return (
    <div className="board">
      <header className="board-top">
        <div className="board-title">
          <h1>Kapé board</h1>
          <p>{board.data ? dayLabel(board.data.date) : 'Today'}</p>
        </div>

        <p className={offline ? 'live is-offline' : 'live'} role="status">
          <i aria-hidden="true" />
          {offline ? 'Offline, trying again…' : board.isPending ? 'Connecting…' : `Live · ${lastUpdate}`}
        </p>

        <div className="board-actions">
          <span className="who">{staff?.name}</span>
          <button type="button" className="link-btn" onClick={() => (playNewOrderChime() ? undefined : void unlockAudio().then(playNewOrderChime))}>
            Test sound
          </button>
          <button type="button" className="link-btn" onClick={leave}>
            Sign out
          </button>
        </div>
      </header>

      <div className="board-controls">
        <PauseOrders notify={notify} />
      </div>
      <SoldOutPanel notify={notify} />

      {board.isError && !board.data ? (
        <div className="empty-state" role="alert">
          <h2>Couldn't load today's orders</h2>
          <p>Check the connection. This will keep trying.</p>
          <button type="button" className="btn btn-primary" onClick={() => void board.refetch()}>
            Try now
          </button>
        </div>
      ) : (
        <main className="columns">
          {COLUMNS.map(({ key, title, empty }) => (
            <section key={key} className="column" aria-labelledby={`column-${key}`}>
              <h2 id={`column-${key}`}>
                {title}
                <span className="count">{columns[key].length}</span>
              </h2>
              {columns[key].length === 0 ? (
                <p className="column-empty">{board.isPending ? 'Loading…' : empty}</p>
              ) : (
                <ul className="tickets">
                  {columns[key].map((order) => (
                    <li key={order.publicId}>
                      <OrderTicket
                        order={order}
                        now={now}
                        busy={actions.busy(order)}
                        onMove={(to, reason) => actions.move({ order, to, reason })}
                        onPay={(method) => actions.pay({ order, method })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </main>
      )}

      <details className="done">
        <summary>
          Done today<span className="count">{columns.done.length}</span>
        </summary>
        {columns.done.length === 0 ? (
          <p className="column-empty">Nothing finished yet.</p>
        ) : (
          <ul className="tickets tickets-done">
            {columns.done.map((order) => (
              <li key={order.publicId}>
                <OrderTicket
                  order={order}
                  now={now}
                  busy={actions.busy(order)}
                  onMove={(to, reason) => actions.move({ order, to, reason })}
                  onPay={(method) => actions.pay({ order, method })}
                />
              </li>
            ))}
          </ul>
        )}
      </details>

      {toast && (
        <p key={toast.id} className="toast" role="alert">
          {toast.text}
          <button type="button" className="link-btn" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </p>
      )}

      {!started && (
        <div className="start" role="dialog" aria-modal="true" aria-labelledby="start-title">
          <div className="start-card">
            <h2 id="start-title">Ready for the shift?</h2>
            <p>Tap to turn on the new-order chime. Keep this page open while you work.</p>
            <button type="button" className="btn btn-primary btn-big" onClick={() => void startShift()} autoFocus>
              Start shift
            </button>
            {!soundReady() && <p className="start-hint">Your browser only plays sound after a tap, which is why this is here.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
