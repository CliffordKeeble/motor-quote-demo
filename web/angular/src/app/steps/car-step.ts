import { Component, input, output } from '@angular/core';
import type { Answers, Vehicle } from '@shared/types';
import type { Errors } from '@shared/validation';
import { vehicleName } from '@shared/vehicleName';
import { Choice, Field, describe, valueOf, type AnswerChange } from '../field';

export type VehiclesStatus = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-car-step',
  imports: [Field, Choice],
  templateUrl: './car-step.html',
})
export class CarStep {
  readonly answers = input.required<Answers>();
  readonly errors = input.required<Errors>();
  readonly vehicles = input.required<Vehicle[]>();
  readonly vehiclesStatus = input.required<VehiclesStatus>();
  readonly changed = output<AnswerChange>();
  readonly retryVehicles = output<void>();

  protected readonly describe = describe;
  protected readonly vehicleName = vehicleName;

  protected put(field: keyof Answers, value: string) {
    this.changed.emit({ field, value });
  }

  protected typed(field: keyof Answers, event: Event) {
    this.put(field, valueOf(event));
  }
}
