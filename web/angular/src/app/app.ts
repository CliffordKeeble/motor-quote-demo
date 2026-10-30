import { Component, type ElementRef, afterRenderEffect, computed, inject, signal, untracked, viewChild } from '@angular/core';
import type { Answers, Quote, Vehicle } from '@shared/types';
import { emptyAnswers, exampleAnswers, stepOf, toRequest, validateStep, type Errors } from '@shared/validation';
import { otherSite, readSwitch, switchFragment } from '@shared/switch';
import { vehicleName } from '@shared/vehicleName';
import type { AnswerChange } from './field';
import { QuoteApi } from './quote-api';
import { QuoteResult } from './quote-result';
import { CarStep, type VehiclesStatus } from './steps/car-step';
import { CoverStep } from './steps/cover-step';
import { DriverStep } from './steps/driver-step';
import { Stepper } from './stepper';

const headings = ['Tell us about your car', 'Tell us about you', 'Choose your cover', 'Your quote'];
const coverNames: Record<string, string> = {
  comprehensive: 'Comprehensive cover',
  tpft: 'Third party, fire and theft',
  tpo: 'Third party only',
};

// The server's refusal (a message for each answer it would not take) as form errors, for the
// answers this form asks. Anything else it says has no field to go on.
function refusedErrors(refused: Record<string, string[]>): Errors {
  const errors: Errors = {};
  for (const [field, messages] of Object.entries(refused)) {
    if (field in stepOf && messages.length > 0) errors[field as keyof Answers] = messages[0];
  }
  return errors;
}

const onOtherSteps = (errors: Errors, step: number): Errors =>
  Object.fromEntries(Object.entries(errors).filter(([field, message]) => message && stepOf[field as keyof Answers] !== step));

// The whole journey. It holds the same state as the React app's App.tsx, as signals, and takes
// the same decisions with the same rules (web/shared/validation.ts).
@Component({
  selector: 'app-root',
  imports: [Stepper, CarStep, DriverStep, CoverStep, QuoteResult],
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(QuoteApi);

  protected readonly headings = headings;
  protected readonly step = signal(0);
  protected readonly answers = signal<Answers>(emptyAnswers);
  protected readonly errors = signal<Errors>({});
  protected readonly quote = signal<Quote | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly vehiclesStatus = signal<VehiclesStatus>('loading');
  // Counts the presses of Continue that could not go on, so each one moves focus to the message.
  private readonly stopped = signal(0);

  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');
  private readonly failure = viewChild<ElementRef<HTMLElement>>('failure');

  protected readonly errorCount = computed(() => Object.values(this.errors()).filter(Boolean).length);
  protected readonly vehicle = computed(() => this.vehicles().find((v) => v.id === this.answers().vehicleId));
  protected readonly coverFor = computed(() => {
    const vehicle = this.vehicle();
    return vehicle ? `${coverNames[this.answers().cover]} for your ${vehicle.make} ${vehicle.model}` : '';
  });
  protected readonly vehicleName = vehicleName;
  // The same journey in the React app, with the answers so far.
  protected readonly switchHref = computed(() => `${otherSite('angular', location)}/${switchFragment(this.step(), this.answers())}`);

  constructor() {
    // Answers carried from the React page by its "Switch to Angular" link, if that is how we came.
    // Then take them out of the address bar, and so out of this history entry.
    const carried = readSwitch(location.hash);
    if (carried) {
      this.step.set(carried.step);
      this.answers.set(carried.answers);
      history.replaceState(null, '', location.pathname + location.search);
    }

    void this.loadVehicles();

    // Move focus to the new heading on each step, so a screen reader announces it.
    afterRenderEffect(() => {
      this.step();
      untracked(() => this.heading().nativeElement.focus());
    });

    // And to the message when Continue could not go on. Focus brings it into view: on a phone the
    // button is at the foot of the form and the message is at its head, out of sight.
    afterRenderEffect(() => {
      if (this.stopped() === 0) return;
      untracked(() => (this.failed() ? this.failure() : this.summary()))?.nativeElement.focus();
    });
  }

  protected async loadVehicles() {
    this.vehiclesStatus.set('loading');
    const found = await this.api.getVehicles();
    if (found) this.vehicles.set(found);
    this.vehiclesStatus.set(found ? 'ready' : 'failed');
  }

  protected set({ field, value }: AnswerChange) {
    this.answers.update((a) => ({ ...a, [field]: value }));
    this.errors.update((e) => ({ ...e, [field]: undefined }));
  }

  protected fillExample() {
    this.answers.set(exampleAnswers());
    this.errors.set({});
    this.failed.set(false);
  }

  protected async next() {
    const step = this.step();
    const found = validateStep(step, this.answers());
    // Keep the server's messages for answers on other steps: they are still waiting for a change.
    this.errors.set({ ...onOtherSteps(this.errors(), step), ...found });
    this.failed.set(false);
    if (Object.keys(found).length > 0) {
      this.stopped.update((n) => n + 1);
      return;
    }
    if (step < 2) {
      this.step.set(step + 1);
      return;
    }
    this.busy.set(true);
    const outcome = await this.api.getQuote(toRequest(this.answers()));
    this.busy.set(false);

    if (outcome.kind === 'quote') {
      this.quote.set(outcome.quote);
      this.step.set(3);
      return;
    }
    if (outcome.kind === 'refused') {
      // The server would not take an answer the browser let through. Show its message on the
      // field, and take the person back to the first step that has one.
      const refused = refusedErrors(outcome.errors);
      const fields = Object.keys(refused) as (keyof Answers)[];
      if (fields.length > 0) {
        this.errors.set(refused);
        this.step.set(Math.min(...fields.map((f) => stepOf[f])));
        return;
      }
    }
    this.failed.set(true);
    this.stopped.update((n) => n + 1);
  }

  protected submit(event: Event) {
    event.preventDefault();
    void this.next();
  }

  protected back() {
    this.errors.set({});
    this.failed.set(false);
    this.step.update((s) => Math.max(0, s - 1));
  }

  protected restart() {
    this.answers.set(emptyAnswers);
    this.quote.set(null);
    this.errors.set({});
    this.failed.set(false);
    this.step.set(0);
  }
}
