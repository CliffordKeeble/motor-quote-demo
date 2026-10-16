import { Choice, Field, describe } from '../components/Field';
import type { StepProps } from './stepProps';

export function DriverStep({ answers, errors, set }: StepProps) {
  return (
    <>
      <Field id="dateOfBirth" label="Your date of birth" error={errors.dateOfBirth}>
        <input
          id="dateOfBirth"
          type="date"
          value={answers.dateOfBirth}
          onChange={(e) => set('dateOfBirth', e.target.value)}
          aria-invalid={!!errors.dateOfBirth}
          aria-describedby={describe('dateOfBirth', false, errors.dateOfBirth)}
        />
      </Field>

      <Field
        id="licenceYears"
        label="How many years have you held a full UK licence?"
        hint="Count whole years. Under a year is 0."
        error={errors.licenceYears}
      >
        <input
          id="licenceYears"
          className="short"
          inputMode="numeric"
          value={answers.licenceYears}
          onChange={(e) => set('licenceYears', e.target.value)}
          aria-invalid={!!errors.licenceYears}
          aria-describedby={describe('licenceYears', true, errors.licenceYears)}
        />
      </Field>

      <Field id="postcode" label="Where is the car kept?" hint="The postcode of the address" error={errors.postcode}>
        <input
          id="postcode"
          className="short postcode"
          autoComplete="postal-code"
          value={answers.postcode}
          onChange={(e) => set('postcode', e.target.value)}
          aria-invalid={!!errors.postcode}
          aria-describedby={describe('postcode', true, errors.postcode)}
        />
      </Field>

      <Field
        id="noClaimsYears"
        label="How many years of no-claims bonus do you have?"
        hint="Years in a row of driving your own insured car without making a claim"
        error={errors.noClaimsYears}
      >
        <input
          id="noClaimsYears"
          className="short"
          inputMode="numeric"
          value={answers.noClaimsYears}
          onChange={(e) => set('noClaimsYears', e.target.value)}
          aria-invalid={!!errors.noClaimsYears}
          aria-describedby={describe('noClaimsYears', true, errors.noClaimsYears)}
        />
      </Field>

      <Choice
        name="claimsLast5Years"
        legend="Claims in the last 5 years"
        hint="Any claim on a car policy, whoever was at fault"
        error={errors.claimsLast5Years}
        value={answers.claimsLast5Years}
        onChange={(v) => set('claimsLast5Years', v)}
        options={[
          { value: '0', label: 'None' },
          { value: '1', label: 'One' },
          { value: '2', label: 'Two or more' },
        ]}
      />
    </>
  );
}
