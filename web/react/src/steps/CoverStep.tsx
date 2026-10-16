import { Choice, Field, describe } from '../components/Field';
import type { StepProps } from './stepProps';

export function CoverStep({ answers, errors, set }: StepProps) {
  return (
    <>
      <Choice
        name="cover"
        legend="How much cover do you want?"
        error={errors.cover}
        value={answers.cover}
        onChange={(v) => set('cover', v)}
        options={[
          { value: 'comprehensive', label: 'Comprehensive', hint: 'Your car and other people’s, including accidents that were your fault' },
          { value: 'tpft', label: 'Third party, fire and theft', hint: 'Other people’s cars and property, and your car if stolen or burnt out' },
          { value: 'tpo', label: 'Third party only', hint: 'The legal minimum: other people’s cars and property' },
        ]}
      />
      <p className="aside">
        Third party only is often dearer than comprehensive. Insurers see more claims from the drivers who choose it.
      </p>

      <Choice
        name="voluntaryExcess"
        legend="Voluntary excess"
        hint="What you agree to pay towards a claim, on top of the compulsory excess. More excess, lower price."
        error={errors.voluntaryExcess}
        value={answers.voluntaryExcess}
        onChange={(v) => set('voluntaryExcess', v)}
        options={[
          { value: '0', label: '£0' },
          { value: '100', label: '£100' },
          { value: '250', label: '£250' },
          { value: '500', label: '£500' },
        ]}
      />

      <Field id="startDate" label="When should cover start?" hint="Any day from today up to 30 days ahead" error={errors.startDate}>
        <input
          id="startDate"
          type="date"
          value={answers.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          aria-invalid={!!errors.startDate}
          aria-describedby={describe('startDate', true, errors.startDate)}
        />
      </Field>

      <fieldset className="field">
        <legend>Extra cover</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={answers.breakdown === 'true'}
            onChange={(e) => set('breakdown', String(e.target.checked))}
          />
          <span>Breakdown cover, roadside and recovery, £45 a year</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={answers.legalExpenses === 'true'}
            onChange={(e) => set('legalExpenses', String(e.target.checked))}
          />
          <span>Legal expenses, to recover costs after an accident that wasn’t your fault, £25 a year</span>
        </label>
      </fieldset>
    </>
  );
}
