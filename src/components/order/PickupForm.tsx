import { useMemo, useState, type FormEvent } from 'react';
import { useManilaMinutes } from '../../hooks/useManilaMinutes';
import { normalizePhone } from '../../lib/orders';
import { pickupSlots, type PickupSlot } from '../../lib/pickupSlots';
import { formatPeso } from '../../lib/pricing';
import { OPENING_TIME, formatTime, isOpen } from '../../lib/time';

/** How many of the earliest times get their own button; the rest sit in a list behind "Later". */
const QUICK_SLOTS = 4;

export type PickupDetails = { name: string; phone: string; slot: PickupSlot };

type PickupFormProps = {
  total: number;
  onBack: () => void;
  /** Rejects when the order could not be sent; the form then shows an error and stays filled in. */
  onPlace: (details: PickupDetails) => Promise<void>;
};

export function PickupForm({ total, onBack, onPlace }: PickupFormProps) {
  const now = useManilaMinutes();
  const slots = useMemo(() => pickupSlots(now), [now]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slotValue, setSlotValue] = useState('');
  const [showLater, setShowLater] = useState(false);
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [sendError, setSendError] = useState(false);
  // Fall back to the earliest slot if the chosen one has passed while the form was open.
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
      <h2 className="head">Pickup details</h2>
      {!isOpen(now) && (
        <p className="soft">We are closed right now, so the first times offered are for our next opening at {formatTime(OPENING_TIME)}.</p>
      )}

      <label className="field">
        <span>Name to call out</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={30} autoComplete="given-name" />
      </label>

      <label className="field">
        <span>
          Mobile number <span className="soft">(optional, in case we need to reach you)</span>
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
            Use a PH mobile number like 0917 123 4567, or leave it blank.
          </span>
        )}
      </label>

      <fieldset className="choice">
        <legend>Pickup time, {chosenSlot.day}</legend>
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
        <span>Total, paid at the counter</span>
        <span className="num">{formatPeso(total)}</span>
      </div>

      {sendError && (
        <p className="form-error" role="alert">
          We couldn't reach the bar just now. Check your connection and try again; your order is still here.
        </p>
      )}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? 'Sending to the bar…' : sendError ? 'Try again' : 'Place order'}
      </button>
      <button type="button" className="text-btn" onClick={onBack} disabled={sending}>
        Back to the order
      </button>
    </form>
  );
}
