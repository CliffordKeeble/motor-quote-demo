import { Component, input } from '@angular/core';

// Where the person is in the four-step journey.
@Component({
  selector: 'app-stepper',
  template: `
    <ol class="stepper" aria-label="Progress">
      @for (name of steps; track name; let i = $index) {
        <li [class]="i < current() ? 'done' : i === current() ? 'current' : ''" [attr.aria-current]="i === current() ? 'step' : null">
          <span class="step-number">{{ i + 1 }}</span>
          <span class="step-name">{{ name }}</span>
        </li>
      }
    </ol>
  `,
})
export class Stepper {
  readonly current = input.required<number>();
  protected readonly steps = ['Your car', 'About you', 'Your cover', 'Your quote'];
}
