import { Choice, Field, describe } from '../components/Field';
import type { Vehicle } from '@shared/types';
import { vehicleName } from '@shared/vehicleName';
import type { StepProps } from './stepProps';

export type VehiclesStatus = 'loading' | 'ready' | 'failed';

interface CarStepProps extends StepProps {
  vehicles: Vehicle[];
  vehiclesStatus: VehiclesStatus;
  retryVehicles: () => void;
}

export function CarStep({ answers, errors, set, vehicles, vehiclesStatus, retryVehicles }: CarStepProps) {
  return (
    <>
      <Field
        id="vehicleId"
        label="Which car do you want to insure?"
        hint={vehiclesStatus === 'loading' ? 'Loading the sample cars…' : 'This demo has seven sample cars.'}
        error={errors.vehicleId}
      >
        <select
          id="vehicleId"
          value={answers.vehicleId}
          onChange={(e) => set('vehicleId', e.target.value)}
          aria-invalid={!!errors.vehicleId}
          aria-describedby={describe('vehicleId', true, errors.vehicleId)}
        >
          <option value="">Choose a car</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleName(v)}, {v.fuel.toLowerCase()}
            </option>
          ))}
        </select>
        {vehiclesStatus === 'failed' && (
          <p className="error" role="alert">
            We couldn’t load the sample cars.{' '}
            <button type="button" className="link" onClick={retryVehicles}>
              Try again
            </button>
          </p>
        )}
      </Field>

      <Field id="carValue" label="What is the car worth today?" hint="In whole pounds" error={errors.carValue}>
        <div className="prefixed">
          <span aria-hidden="true">£</span>
          <input
            id="carValue"
            inputMode="numeric"
            value={answers.carValue}
            onChange={(e) => set('carValue', e.target.value)}
            aria-invalid={!!errors.carValue}
            aria-describedby={describe('carValue', true, errors.carValue)}
          />
        </div>
      </Field>

      <Choice
        name="overnight"
        legend="Where is it kept overnight?"
        error={errors.overnight}
        value={answers.overnight}
        onChange={(v) => set('overnight', v)}
        options={[
          { value: 'garage', label: 'Garage' },
          { value: 'driveway', label: 'Driveway' },
          { value: 'street', label: 'On the street' },
        ]}
      />

      <Choice
        name="mileage"
        legend="How many miles a year?"
        error={errors.mileage}
        value={answers.mileage}
        onChange={(v) => set('mileage', v)}
        options={[
          { value: 'under5k', label: 'Under 5,000' },
          { value: '5to10k', label: '5,000 to 10,000' },
          { value: '10to15k', label: '10,000 to 15,000' },
          { value: 'over15k', label: 'Over 15,000' },
        ]}
      />

      <Choice
        name="use"
        legend="What is it used for?"
        error={errors.use}
        value={answers.use}
        onChange={(v) => set('use', v)}
        options={[
          { value: 'social', label: 'Social only', hint: 'Shopping, visiting, days out' },
          { value: 'commuting', label: 'Social and commuting', hint: 'Including driving to work' },
          { value: 'business', label: 'Business', hint: 'Driving as part of your job' },
        ]}
      />
    </>
  );
}
