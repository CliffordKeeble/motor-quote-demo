import { Component, input, output } from '@angular/core';
import type { Answers } from '@shared/types';

// One answer changing, as a step tells the page about it.
export interface AnswerChange {
  field: keyof Answers;
  value: string;
}

// What an input or a select holds now.
export const valueOf = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value;

// The ids an input should point at so a screen reader reads its hint and error.
export const describe = (id: string, hasHint: boolean, error?: string) =>
  [hasHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || null;

// A labelled input with an optional hint and error, wired up for screen readers.
// The input itself is projected in.
@Component({
  selector: 'app-field',
  template: `
    <div [class]="error() ? 'field has-error' : 'field'">
      <label [for]="for()">{{ label() }}</label>
      @if (hint()) {
        <p class="hint" [id]="for() + '-hint'">{{ hint() }}</p>
      }
      @if (error()) {
        <p class="error" [id]="for() + '-error'">{{ error() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class Field {
  readonly for = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
}

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

// A set of radio buttons drawn as tiles; one answer from a short list.
@Component({
  selector: 'app-choice',
  template: `
    <fieldset [class]="error() ? 'field has-error' : 'field'" [attr.aria-describedby]="error() ? name() + '-error' : null">
      <legend>{{ legend() }}</legend>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
      @if (error()) {
        <p class="error" [id]="name() + '-error'">{{ error() }}</p>
      }
      <div class="choices">
        @for (o of options(); track o.value) {
          <label [class]="value() === o.value ? 'choice selected' : 'choice'">
            <input type="radio" [name]="name()" [value]="o.value" [checked]="value() === o.value" (change)="picked.emit(o.value)" />
            <span class="choice-label">{{ o.label }}</span>
            @if (o.hint) {
              <span class="choice-hint">{{ o.hint }}</span>
            }
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class Choice {
  readonly name = input.required<string>();
  readonly legend = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly options = input.required<Option[]>();
  readonly value = input.required<string>();
  readonly picked = output<string>();
}
