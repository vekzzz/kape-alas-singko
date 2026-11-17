type Choice<T extends string> = { value: T; label: string };

type ChoiceGroupProps<T extends string> = {
  legend: string;
  name: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
};

/** A row of radio buttons styled as pills. */
export function ChoiceGroup<T extends string>({ legend, name, value, choices, onChange }: ChoiceGroupProps<T>) {
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-row">
        {choices.map((choice) => (
          <label key={choice.value} className="pill-option">
            <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
