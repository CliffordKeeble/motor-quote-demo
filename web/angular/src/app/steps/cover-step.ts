import { Component, input, output } from '@angular/core';
import type { Answers } from '@shared/types';
import type { Errors } from '@shared/validation';
import { Choice, Field, describe, valueOf, type AnswerChange } from '../field';

@Component({
  selector: 'app-cover-step',
  imports: [Field, Choice],
  templateUrl: './cover-step.html',
})
export class CoverStep {
  readonly answers = input.required<Answers>();
  readonly errors = input.required<Errors>();
  readonly changed = output<AnswerChange>();

  protected readonly describe = describe;

  protected put(field: keyof Answers, value: string) {
    this.changed.emit({ field, value });
  }

  protected typed(field: keyof Answers, event: Event) {
    this.put(field, valueOf(event));
  }

  protected ticked(field: keyof Answers, event: Event) {
    this.put(field, String((event.target as HTMLInputElement).checked));
  }
}
