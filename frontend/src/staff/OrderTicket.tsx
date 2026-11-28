import { CANCEL_REASONS, nextStatus, previousStatus, type CancelReason, type OrderStatus, type PaymentMethod, type StaffOrder } from '@kape/contract';
import { useState } from 'react';
import { formatPeso } from '../lib/pricing';
import { ORDER_TYPE_LABELS } from '../lib/orders';
import { formatTime, manilaMinutes } from '../lib/time';
import { STATUS_LABELS, isFresh, pickupTiming } from './boardData';

const ADVANCE_LABELS: Partial<Record<OrderStatus, string>> = {
  received: 'Start making',
  preparing: 'Mark ready',
  ready: 'Hand over',
};

const REASON_LABELS: Record<CancelReason, string> = {
  sold_out: 'We ran out',
  customer_request: 'Customer asked',
  no_show: 'No-show',
  other: 'Other',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash' };

type OrderTicketProps = {
  order: StaffOrder;
  /** Current time in milliseconds. */
  now: number;
  /** A button on this ticket is waiting for the server. */
  busy: boolean;
  onMove: (to: OrderStatus, reason?: CancelReason) => void;
  onPay: (method: PaymentMethod) => void;
};

/** One order as the bar sees it: who, when, what, whether it is paid, and the buttons to move it along. */
export function OrderTicket({ order, now, busy, onMove, onPay }: OrderTicketProps) {
  const [choosing, setChoosing] = useState<'cancel' | 'payment' | null>(null);
  const next = nextStatus(order.status);
  const back = previousStatus(order.status);
  const timing = pickupTiming(order, now);
  const cancelled = order.status === 'cancelled';
  const canCancel = order.status === 'received' || order.status === 'preparing' || order.status === 'ready';
  const pickup = formatTime(manilaMinutes(new Date(order.pickupAt)));

  const toggle = (what: 'cancel' | 'payment') => setChoosing((current) => (current === what ? null : what));

  return (
    <article className={['ticket', `is-${order.status}`, timing.tone === 'late' && 'is-late'].filter(Boolean).join(' ')} aria-label={`Order ${order.number}, ${order.name}`} aria-busy={busy}>
      <header className="ticket-head">
        <p className="ticket-number">{order.number}</p>
        <div className="ticket-who">
          <p className="ticket-name">{order.name}</p>
          <p className="ticket-meta">
            {ORDER_TYPE_LABELS[order.orderType]}
            {order.phone && (
              <>
                {' · '}
                <a href={`tel:${order.phone}`}>{order.phone}</a>
              </>
            )}
          </p>
        </div>
        {isFresh(order, now) && <span className="tag tag-new">New</span>}
        {(order.status === 'collected' || cancelled) && <span className={`tag tag-${order.status}`}>{STATUS_LABELS[order.status]}</span>}
      </header>

      <p className="ticket-when">
        <span className="ticket-time">{pickup}</span>
        {timing.text && <span className={`ticket-timing is-${timing.tone}`}>{timing.text}</span>}
      </p>

      <ul className="ticket-lines">
        {order.lines.map((line, index) => (
          <li key={index}>
            <span className="ticket-qty">{line.quantity}×</span>
            <span>
              <strong>{line.itemName}</strong>
              {line.optionLabels.length > 0 && <span className="ticket-options"> · {line.optionLabels.join(', ')}</span>}
              {line.note && <span className="ticket-note">“{line.note}”</span>}
            </span>
          </li>
        ))}
      </ul>

      {cancelled && order.cancelReason && <p className="ticket-reason">Cancelled: {REASON_LABELS[order.cancelReason].toLowerCase()}</p>}

      {!cancelled && (
        <div className="ticket-pay">
          <p className="ticket-total">
            {formatPeso(order.totalCentavos / 100)}
            {order.paid && order.paymentMethod ? <span className="tag tag-paid">Paid · {PAYMENT_LABELS[order.paymentMethod]}</span> : <span className="tag tag-unpaid">Unpaid</span>}
          </p>
          {order.paid ? (
            <button type="button" className="link-btn" onClick={() => toggle('payment')} disabled={busy}>
              {choosing === 'payment' ? 'Keep it' : 'Change'}
            </button>
          ) : null}
          {(!order.paid || choosing === 'payment') && (
            <div className="ticket-pay-buttons" role="group" aria-label="Record payment">
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    onPay(method);
                    setChoosing(null);
                  }}
                  disabled={busy || (order.paid && order.paymentMethod === method)}
                >
                  {order.paid ? `Was ${PAYMENT_LABELS[method]}` : `Paid ${PAYMENT_LABELS[method]}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {choosing === 'cancel' && (
        <div className="ticket-cancel" role="group" aria-label="Why is it being cancelled?">
          <p>Why?</p>
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="btn btn-danger"
              onClick={() => {
                onMove('cancelled', reason);
                setChoosing(null);
              }}
              disabled={busy}
            >
              {REASON_LABELS[reason]}
            </button>
          ))}
        </div>
      )}

      {(next || back || canCancel) && (
        <footer className="ticket-actions">
          {next && (
            <button type="button" className="btn btn-primary" onClick={() => onMove(next)} disabled={busy}>
              {ADVANCE_LABELS[order.status]}
            </button>
          )}
          {back && (
            <button type="button" className="link-btn" onClick={() => onMove(back)} disabled={busy}>
              Back to {STATUS_LABELS[back].toLowerCase()}
            </button>
          )}
          {canCancel && (
            <button type="button" className="link-btn link-danger" onClick={() => toggle('cancel')} disabled={busy}>
              {choosing === 'cancel' ? 'Keep order' : 'Cancel…'}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
