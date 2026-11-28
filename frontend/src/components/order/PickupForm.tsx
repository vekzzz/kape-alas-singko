import { useMemo, useRef, useState, type FormEvent } from 'react';
import { usePickupSlotsQuery, useShop } from '../../api/hooks';
import { useNow } from '../../hooks/useNow';
import { placeOrderMessage } from '../../lib/orderErrors';
import { normalizePhone, type OrderType } from '../../lib/orders';
import { toPickupSlots, type PickupSlot } from '../../lib/pickupSlots';
import { formatPeso } from '../../lib/pricing';
import { openStatus } from '../../lib/shop';
import { formatTime } from '../../lib/time';

const QUICK_SLOTS = 4;

export type PickupDetails = { name: string; phone: string; slot: PickupSlot };

type PickupFormProps = {
  orderType: OrderType;
  total: number;
  onBack: () => void;
  onPlace: (details: PickupDetails) => Promise<void>;
};

export function PickupForm({ orderType, total, onBack, onPlace }: PickupFormProps) {
  const now = useNow();
  const { data: shop } = useShop();
  const slotsQuery = usePickupSlotsQuery();
  const slots = useMemo(() => (slotsQuery.data ? toPickupSlots(slotsQuery.data, now) : []), [slotsQuery.data, now]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slotValue, setSlotValue] = useState('');
  const [showLater, setShowLater] = useState(false);
  const [sending, setSending] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  // What went wrong the last time we tried to send the order, in words for the customer.
  const [sendError, setSendError] = useState<string | null>(null);
  const chosenSlot = slots.find((slot) => slot.value === slotValue) ?? slots[0];
  const quickSlots = slots.slice(0, QUICK_SLOTS);
  const laterSlots = slots.slice(QUICK_SLOTS);
  const laterChosen = showLater && chosenSlot !== undefined && laterSlots.includes(chosenSlot);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || !chosenSlot) return;

    const missingName = !name.trim();
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : '';
    setNameError(missingName);
    setPhoneError(normalizedPhone === null);
    if (missingName) {
      nudge(nameRef.current);
      return;
    }
    if (normalizedPhone === null) {
      nudge(phoneRef.current);
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await onPlace({ name: name.trim(), phone: normalizedPhone, slot: chosenSlot });
    } catch (error) {
      setSendError(placeOrderMessage(error));
      setSending(false);
    }
  };

  return (
    <form className="cart" onSubmit={handleSubmit} aria-busy={sending} noValidate>
      <h2 className="head">Almost there!</h2>
      <p className="soft">
        {orderType === 'dine-in' ? "You're dining in. We'll call your name when it's on the counter." : "It's to go. We'll pack it up and call your name at the counter."}
      </p>
      {shop && chosenSlot && !openStatus(shop, now).open && (
        <p className="soft">We're closed right now, so the earliest times are for when we open at {formatTime(slots[0]!.minutes)}.</p>
      )}

      <label className="field">
        <span>What name should we call out?</span>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(false);
          }}
          required
          maxLength={30}
          autoComplete="given-name"
          placeholder="e.g. Maria"
          aria-invalid={nameError}
          aria-describedby={nameError ? 'name-error' : undefined}
        />
        {nameError && <FieldError id="name-error">Just your first name is fine, so we know who to call.</FieldError>}
      </label>

      <label className="field">
        <span>
          Your mobile number <span className="soft">(optional, only if we need to reach you)</span>
        </span>
        <input
          ref={phoneRef}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneError(false);
          }}
          onBlur={() => setPhoneError(phone.trim() !== '' && normalizePhone(phone) === null)}
          maxLength={16}
          autoComplete="tel"
          placeholder="0917 123 4567"
          aria-invalid={phoneError}
          aria-describedby={phoneError ? 'phone-error' : undefined}
        />
        {phoneError && (
          <FieldError id="phone-error">Hmm, that number doesn't look quite right. Try one like 0917 123 4567, or leave it blank.</FieldError>
        )}
      </label>

      {!chosenSlot && (
        <p className="soft" role="status">
          {slotsQuery.isError
            ? "We couldn't load pickup times. Check your connection and try again in a moment."
            : slotsQuery.isPending
              ? 'Finding pickup times…'
              : "We're not taking orders right now. Please check back soon, or order at the counter."}
        </p>
      )}

      {chosenSlot && (
      <fieldset className="choice">
        <legend>
          When should it be ready? ({chosenSlot.day})
        </legend>
        <div className="choice-row">
          {quickSlots.map((slot, index) => (
            <label key={slot.value} className="pill-option">
              <input
                type="radio"
                name="pickup"
                checked={!laterChosen && chosenSlot === slot}
                onChange={() => {
                  setSlotValue(slot.value);
                  setShowLater(false);
                }}
              />
              <span>
                {formatTime(slot.minutes)}
                {index === 0 && ' · soonest'}
              </span>
            </label>
          ))}
          {laterSlots.length > 0 && (
            <label className="pill-option">
              <input
                type="radio"
                name="pickup"
                checked={laterChosen}
                onChange={() => {
                  setShowLater(true);
                  setSlotValue(laterSlots[0]!.value);
                }}
              />
              <span>Later…</span>
            </label>
          )}
        </div>
        {laterChosen && (
          <label className="field">
            <span className="visually-hidden">Later pickup time</span>
            <select value={chosenSlot.value} onChange={(event) => setSlotValue(event.target.value)}>
              {laterSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {formatTime(slot.minutes)}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      )}

      <div className="cart-sum">
        <span>Payment at the counter</span>
        <span className="num">{formatPeso(total)}</span>
      </div>

      {sendError && (
        <p className="form-error" role="alert">
          {sendError}
        </p>
      )}

      <button type="submit" className="btn" disabled={sending || !chosenSlot}>
        {sending ? 'Sending it to the bar…' : sendError ? 'Try again' : 'Prepare my order'}
      </button>
      <button type="button" className="text-btn" onClick={onBack} disabled={sending}>
        Back to my order
      </button>
    </form>
  );
}

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} className="field-error" role="alert">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" />
        <path d="M10 5.5v5.5M10 14.2v.3" />
      </svg>
      {children}
    </span>
  );
}

function nudge(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const calm = document.documentElement.classList.contains('lite') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) return;
  input.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
    { duration: 360, easing: 'ease-out' },
  );
}
