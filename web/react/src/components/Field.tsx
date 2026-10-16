import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// A labelled input with an optional hint and error, wired up for screen readers.
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="error" id={`${id}-error`}>{error}</p>}
      {children}
    </div>
  );
}

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface ChoiceProps {
  name: string;
  legend: string;
  hint?: string;
  error?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

// A set of radio buttons drawn as tiles; one answer from a short list.
export function Choice({ name, legend, hint, error, options, value, onChange }: ChoiceProps) {
  return (
    <fieldset className={error ? 'field has-error' : 'field'} aria-describedby={error ? `${name}-error` : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="error" id={`${name}-error`}>{error}</p>}
      <div className="choices">
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? 'choice selected' : 'choice'}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="choice-label">{o.label}</span>
            {o.hint && <span className="choice-hint">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// The ids an input should point at so a screen reader reads its hint and error.
export const describe = (id: string, hasHint: boolean, error?: string) =>
  [hasHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
