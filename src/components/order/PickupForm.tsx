import { useMemo, useState, type FormEvent } from 'react';
import { useManilaMinutes } from '../../hooks/useManilaMinutes';
import { pickupSlots } from '../../lib/pickupSlots';
import { formatPeso } from '../../lib/pricing';
import { isOpen } from '../../lib/time';

type PickupFormProps = {
  total: number;
  onBack: () => void;
  onPlace: (details: { name: string; pickupLabel: string }) => void;
};

export function PickupForm({ total, onBack, onPlace }: PickupFormProps) {
  const now = useManilaMinutes();
  const slots = useMemo(() => pickupSlots(now), [now]);
  const [name, setName] = useState('');
  const [slotValue, setSlotValue] = useState('');
  // Fall back to the earliest slot if the chosen one has passed while the form was open.
  const chosenSlot = slots.find((slot) => slot.value === slotValue) ?? slots[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onPlace({ name: name.trim(), pickupLabel: chosenSlot.label });
  };

  return (
    <form className="cart" onSubmit={handleSubmit}>
      <h2 className="head">Pickup details</h2>
      {!isOpen(now) && <p className="soft">We are closed right now, so the first times offered are for our next opening at 5:00 AM.</p>}

      <label className="field">
        <span>Name to call out</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={30} autoComplete="given-name" />
      </label>

      <label className="field">
        <span>Pickup time</span>
        <select value={chosenSlot.value} onChange={(event) => setSlotValue(event.target.value)}>
          {slots.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </label>

      <div className="cart-sum">
        <span>Total, paid at the counter</span>
        <span className="num">{formatPeso(total)}</span>
      </div>
      <button type="submit" className="btn">
        Place order
      </button>
      <button type="button" className="text-btn" onClick={onBack}>
        Back to the order
      </button>
    </form>
  );
}
