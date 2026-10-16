import type { Quote } from '../types';

const money = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

function change(line: Quote['lines'][number]) {
  if (line.kind === 'base') return '';
  if (line.kind !== 'factor') return `+${money(line.amount)}`;
  const pct = Math.round((line.multiplier! - 1) * 100);
  if (pct === 0) return 'no change';
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

// The date is a plain calendar date, so read and write it in UTC: in a time zone behind UTC a
// local reading of midnight UTC would be the day before.
function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

interface Props {
  quote: Quote;
  coverFor: string; // e.g. 'Comprehensive cover for your Volkswagen Golf 1.5 TSI Life'
  onChange: () => void;
  onRestart: () => void;
}

export function QuoteResult({ quote, coverFor, onChange, onRestart }: Props) {
  const peak = Math.max(...quote.lines.map((l) => l.runningTotal));

  return (
    <div className="quote">
      <section className="price-sign" aria-labelledby="price-heading">
        <h2 id="price-heading">{coverFor}</h2>
        <p className="price">
          {money(quote.annual)} <span className="per">a year</span>
        </p>
        <p className="monthly">
          or 12 payments of {money(quote.monthly)}, which includes an 8% charge for paying monthly
        </p>
        <p className="ref">
          Quote reference {quote.reference}, valid until {longDate(quote.validUntil)}
        </p>
      </section>

      <section aria-labelledby="working-heading">
        <h2 id="working-heading">How we worked out your price</h2>
        <p className="intro">
          Every price starts from the same figure for your level of cover. Each answer then moves it up or down.
        </p>
        <table className="working">
          <thead>
            <tr>
              <th scope="col">What we looked at</th>
              <th scope="col">Your answer</th>
              <th scope="col" className="num">Effect</th>
              <th scope="col" className="num">Price so far</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.label} className={`line-${line.kind}`}>
                <th scope="row">{line.label}</th>
                <td>{line.detail}</td>
                <td className={`num effect ${line.amount < 0 ? 'down' : line.amount > 0 ? 'up' : ''}`}>
                  {change(line)}
                </td>
                <td className="num total">
                  {money(line.runningTotal)}
                  <span className="bar" aria-hidden="true" style={{ width: `${(line.runningTotal / peak) * 100}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total for the year
              </th>
              <td className="num">{money(quote.annual)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section aria-labelledby="excess-heading" className="excess">
        <h2 id="excess-heading">If you claim</h2>
        <p>
          You pay the first {money(quote.compulsoryExcess + quote.voluntaryExcess)} of any claim: a compulsory{' '}
          {money(quote.compulsoryExcess)} and the voluntary {money(quote.voluntaryExcess)} you chose.
        </p>
      </section>

      <div className="actions">
        <button type="button" className="secondary" onClick={onChange}>
          Change your answers
        </button>
        <button type="button" className="link" onClick={onRestart}>
          Start a new quote
        </button>
      </div>
    </div>
  );
}
