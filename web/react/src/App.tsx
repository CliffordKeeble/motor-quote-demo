import { useCallback, useEffect, useRef, useState } from 'react';
import { Stepper } from './components/Stepper';
import { CarStep, type VehiclesStatus } from './steps/CarStep';
import { DriverStep } from './steps/DriverStep';
import { CoverStep } from './steps/CoverStep';
import { QuoteResult } from './steps/QuoteResult';
import { getQuote, getVehicles } from './api/quoteApi';
import { emptyAnswers, exampleAnswers, stepOf, toRequest, validateStep, type Errors } from '@shared/validation';
import { vehicleName } from '@shared/vehicleName';
import type { Answers, Quote, Vehicle } from '@shared/types';

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

export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [errors, setErrors] = useState<Errors>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesStatus, setVehiclesStatus] = useState<VehiclesStatus>('loading');
  const heading = useRef<HTMLHeadingElement>(null);
  const message = useRef<HTMLDivElement>(null);
  // Counts the presses of Continue that could not go on, so each one moves focus to the message.
  const [stopped, setStopped] = useState(0);

  const loadVehicles = useCallback(async () => {
    setVehiclesStatus('loading');
    const found = await getVehicles();
    if (found) setVehicles(found);
    setVehiclesStatus(found ? 'ready' : 'failed');
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  // Move focus to the new heading on each step, so a screen reader announces it.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // And to the message when Continue could not go on. Focus brings it into view: on a phone the
  // button is at the foot of the form and the message is at its head, out of sight.
  useEffect(() => {
    if (stopped > 0) message.current?.focus();
  }, [stopped]);

  const set = (field: keyof Answers, value: string) => {
    setAnswers((a) => ({ ...a, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function next() {
    const found = validateStep(step, answers);
    // Keep the server's messages for answers on other steps: they are still waiting for a change.
    setErrors({ ...onOtherSteps(errors, step), ...found });
    setFailed(false);
    if (Object.keys(found).length > 0) {
      setStopped((n) => n + 1);
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    const outcome = await getQuote(toRequest(answers));
    setBusy(false);

    if (outcome.kind === 'quote') {
      setQuote(outcome.quote);
      setStep(3);
      return;
    }
    if (outcome.kind === 'refused') {
      // The server would not take an answer the browser let through. Show its message on the
      // field, and take the person back to the first step that has one.
      const refused = refusedErrors(outcome.errors);
      const fields = Object.keys(refused) as (keyof Answers)[];
      if (fields.length > 0) {
        setErrors(refused);
        setStep(Math.min(...fields.map((f) => stepOf[f])));
        return;
      }
    }
    setFailed(true);
    setStopped((n) => n + 1);
  }

  const back = () => {
    setErrors({});
    setFailed(false);
    setStep(Math.max(0, step - 1));
  };

  const restart = () => {
    setAnswers(emptyAnswers);
    setQuote(null);
    setErrors({});
    setFailed(false);
    setStep(0);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const vehicle = vehicles.find((v) => v.id === answers.vehicleId);

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <p className="brand">Fenmoor Motor</p>
          <p className="disclaimer">A fictional insurer. Prices are illustrative and nothing is sold.</p>
        </div>
      </header>

      <main className="wrap">
        <Stepper current={step} />

        <div className={step === 3 ? 'layout wide' : 'layout'}>
          <div className="main-col">
            <h1 ref={heading} tabIndex={-1}>
              {headings[step]}
            </h1>

            {step === 0 && (
              <button
                type="button"
                className="link example"
                onClick={() => {
                  setAnswers(exampleAnswers());
                  setErrors({});
                  setFailed(false);
                }}
              >
                Fill in example answers
              </button>
            )}

            {errorCount > 0 && (
              <div className="error-summary" role="alert" tabIndex={-1} ref={failed ? undefined : message}>
                {errorCount === 1 ? 'One answer needs' : `${errorCount} answers need`} changing before you can continue.
              </div>
            )}

            {failed && (
              <div className="error-summary" role="alert" tabIndex={-1} ref={message}>
                We couldn’t work out your price just now. Your answers are all still here. Please try again.
              </div>
            )}

            {step < 3 && (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void next();
                }}
              >
                {step === 0 && (
                  <CarStep
                    answers={answers}
                    errors={errors}
                    set={set}
                    vehicles={vehicles}
                    vehiclesStatus={vehiclesStatus}
                    retryVehicles={() => void loadVehicles()}
                  />
                )}
                {step === 1 && <DriverStep answers={answers} errors={errors} set={set} />}
                {step === 2 && <CoverStep answers={answers} errors={errors} set={set} />}

                <div className="actions">
                  {step > 0 && (
                    <button type="button" className="secondary" onClick={back}>
                      Back
                    </button>
                  )}
                  <button type="submit" className="primary" disabled={busy}>
                    {step < 2 ? 'Continue' : busy ? 'Working out your price…' : 'Get my quote'}
                  </button>
                </div>

                {busy && (
                  <p className="waiting" role="status">
                    Working out your price. The first quote after a quiet spell can take a few seconds.
                  </p>
                )}
              </form>
            )}

            {step === 3 && quote && vehicle && (
              <QuoteResult
                quote={quote}
                coverFor={`${coverNames[answers.cover]} for your ${vehicle.make} ${vehicle.model}`}
                onChange={() => setStep(0)}
                onRestart={restart}
              />
            )}
          </div>

          {step < 3 && (
            <aside className="summary" aria-label="Your answers so far">
              <h2>Your answers</h2>
              <dl>
                <dt>Car</dt>
                <dd>{vehicle ? vehicleName(vehicle) : 'Not chosen yet'}</dd>
                {vehicle && (
                  <>
                    <dt>Insurance group</dt>
                    <dd>{vehicle.group} of 50</dd>
                  </>
                )}
                {step > 0 && (
                  <>
                    <dt>Postcode</dt>
                    <dd>{answers.postcode.toUpperCase() || 'Not given yet'}</dd>
                  </>
                )}
              </dl>
            </aside>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            A demonstration of a quote journey in React and TypeScript. Fenmoor Motor does not exist. Rating factors,
            insurance groups and area bands are invented; Insurance Premium Tax is the real standard rate of 12%.
          </p>
        </div>
      </footer>
    </>
  );
}
