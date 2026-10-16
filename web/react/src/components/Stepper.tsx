const steps = ['Your car', 'About you', 'Your cover', 'Your quote'];

// Where the person is in the four-step journey.
export function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((name, i) => (
        <li
          key={name}
          className={i < current ? 'done' : i === current ? 'current' : ''}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="step-number">{i + 1}</span>
          <span className="step-name">{name}</span>
        </li>
      ))}
    </ol>
  );
}
