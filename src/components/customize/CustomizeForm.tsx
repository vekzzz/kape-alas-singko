import { useState, type FormEvent } from 'react';
import { useCart } from '../../cart/useCart';
import { isCustomizable, type MenuItem } from '../../data/menu';
import { flyToCart } from '../../lib/flyToCart';
import { EXTRA_COSTS, defaultOptions, formatPeso, unitPrice, type CartLine, type DrinkOptions } from '../../lib/pricing';
import { ProductArt } from '../product-art/ProductArt';
import { QuantityStepper } from '../ui/QuantityStepper';
import { ChoiceGroup } from './ChoiceGroup';

type CustomizeFormProps = {
  item: MenuItem;
  editing?: CartLine;
  onDone: () => void;
};

export function CustomizeForm({ item, editing, onDone }: CustomizeFormProps) {
  const { dispatch } = useCart();
  const [options, setOptions] = useState<DrinkOptions>(editing?.options ?? defaultOptions(item));
  const [note, setNote] = useState(editing?.note ?? '');
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);

  const updateOptions = (changes: Partial<DrinkOptions>) => setOptions((current) => ({ ...current, ...changes }));
  const total = unitPrice(item, options) * quantity;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const details = { options, note: note.trim(), quantity };

    if (editing) {
      dispatch({ type: 'update', id: editing.id, ...details });
    } else {
      dispatch({ type: 'add', itemId: item.id, ...details });
      flyToCart((event.nativeEvent as SubmitEvent).submitter);
    }
    onDone();
  };

  return (
    <form className="customize" onSubmit={handleSubmit}>
      <div className="customize-stage">
        <div className="disc" />
        <ProductArt item={item} options={options} />
      </div>
      <h2 className="head">{item.name}</h2>
      <p className="soft">{item.description}</p>

      {item.hasSizes && (
        <ChoiceGroup
          legend="Size"
          name="size"
          value={options.size}
          onChange={(size) => updateOptions({ size })}
          choices={[
            { value: 'regular', label: 'Regular' },
            { value: 'large', label: `Large +${formatPeso(EXTRA_COSTS.large)}` },
          ]}
        />
      )}

      {item.hasTemperatures && (
        <ChoiceGroup
          legend="Served"
          name="temperature"
          value={options.temperature}
          onChange={(temperature) => updateOptions({ temperature })}
          choices={[
            { value: 'hot', label: 'Hot' },
            { value: 'iced', label: 'Iced' },
          ]}
        />
      )}

      {item.hasMilk && (
        <ChoiceGroup
          legend="Milk"
          name="milk"
          value={options.milk}
          onChange={(milk) => updateOptions({ milk })}
          choices={[
            { value: 'whole', label: 'Whole' },
            { value: 'oat', label: `Oat +${formatPeso(EXTRA_COSTS.oat)}` },
            { value: 'none', label: 'None' },
          ]}
        />
      )}

      {item.hasExtraShot && (
        <fieldset className="choice">
          <legend>Strength</legend>
          <label className="pill-option">
            <input type="checkbox" checked={options.extraShot} onChange={(event) => updateOptions({ extraShot: event.target.checked })} />
            <span>Extra shot +{formatPeso(EXTRA_COSTS.extraShot)}</span>
          </label>
        </fieldset>
      )}

      {!isCustomizable(item) && item.note && <p className="soft">{item.note}</p>}

      <label className="field">
        <span>Note for the bar</span>
        <input type="text" value={note} onChange={(event) => setNote(event.target.value)} maxLength={60} placeholder="Less ice, extra hot…" />
      </label>

      <div className="customize-foot">
        <QuantityStepper value={quantity} onChange={setQuantity} label="Quantity" />
        <button type="submit" className="btn grow">
          {editing ? 'Save changes' : 'Add to order'} · {formatPeso(total)}
        </button>
      </div>
    </form>
  );
}
