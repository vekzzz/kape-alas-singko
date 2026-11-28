type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  label: string;
};

export function QuantityStepper({ value, onChange, min = 1, label }: QuantityStepperProps) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="round" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="One fewer">
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" className="round" onClick={() => onChange(value + 1)} aria-label="One more">
        +
      </button>
    </div>
  );
}
