import { useMemo, useState, type FormEvent } from 'react';
import { useManilaMinutes } from '../../hooks/useManilaMinutes';
import { normalizePhone, type OrderType } from '../../lib/orders';
import { pickupSlots, type PickupSlot } from '../../lib/pickupSlots';
import { formatPeso } from '../../lib/pricing';
import { OPENING_TIME, formatTime, isOpen } from '../../lib/time';

const QUICK_SLOTS = 4;

export type PickupDetails = { name: string; phone: string; slot: PickupSlot };

type PickupFormProps = {
  orderType: OrderType;
  total: number;
  onBack: () => void;
  onPlace: (details: PickupDetails) => Promise<void>;
};

export function PickupForm({ orderType, total, onBack, onPlace }: PickupFormProps) {
  const now = useManilaMinutes();
  const slots = useMemo(() => pickupSlots(now), [now]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slotValue, setSlotValue] = useState('');
  const [showLater, setShowLater] = useState(false);
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [sendError, setSendError] = useState(false);
  const chosenSlot = slots.find((slot) => slot.value === slotValue) ?? slots[0];
  const quickSlots = slots.slice(0, QUICK_SLOTS);
  const laterSlots = slots.slice(QUICK_SLOTS);
  const laterChosen = showLater && laterSlots.includes(chosenSlot);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const normalizedPhone = phone.trim() ? normalizePhone(phone) : '';
    if (normalizedPhone === null) {
      setPhoneError(true);
      return;
    }

    setSending(true);
    setSendError(false);
    try {
      await onPlace({ name: name.trim(), phone: normalizedPhone, slot: chosenSlot });
    } catch {
      setSendError(true);
      setSending(false);
    }
  };

  return (
    <form className="cart" onSubmit={handleSubmit} aria-busy={sending}>
      <h2 className="head">Almost there!</h2>
      <p className="soft">
        {orderType === 'dine-in' ? "You're dining in. We'll call your name when it's on the counter." : "It's to go. We'll pack it up and call your name at the counter."}
      </p>
      {!isOpen(now) && (
        <p className="soft">We're closed right now, so the earliest times are for when we open at {formatTime(OPENING_TIME)}.</p>
      )}

      <label className="field">
        <span>What name should we call out?</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={30} autoComplete="given-name" />
      </label>

      <label className="field">
        <span>
          Your mobile number <span className="soft">(optional, only if we need to reach you)</span>
        </span>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneError(false);
          }}
          maxLength={16}
          autoComplete="tel"
          placeholder="0917 123 4567"
          aria-invalid={phoneError}
          aria-describedby={phoneError ? 'phone-error' : undefined}
        />
        {phoneError && (
          <span id="phone-error" className="form-error" role="alert">
            That number doesn't look right. Try one like 0917 123 4567, or leave it blank.
          </span>
        )}
      </label>

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

      <div className="cart-sum">
        <span>You'll pay at the counter</span>
        <span className="num">{formatPeso(total)}</span>
      </div>

      {sendError && (
        <p className="form-error" role="alert">
          Hmm, we couldn't reach the bar. Check your connection and try again. Don't worry, your order is still here.
        </p>
      )}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? 'Sending it to the bar…' : sendError ? 'Try again' : 'Send my order'}
      </button>
      <button type="button" className="text-btn" onClick={onBack} disabled={sending}>
        Back to my order
      </button>
    </form>
  );
}
