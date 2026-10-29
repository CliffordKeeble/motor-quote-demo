import { Component, computed, input, output } from '@angular/core';
import type { Quote, QuoteLine } from '@shared/types';

const money = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

function change(line: QuoteLine) {
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

// The price, and every step of how it was worked out. The same page as the React app's
// steps/QuoteResult.tsx, with the same three formatting rules above.
@Component({
  selector: 'app-quote-result',
  templateUrl: './quote-result.html',
})
export class QuoteResult {
  readonly quote = input.required<Quote>();
  readonly coverFor = input.required<string>(); // e.g. 'Comprehensive cover for your Volkswagen Golf 1.5 TSI Life'
  readonly changeAnswers = output<void>();
  readonly restart = output<void>();

  protected readonly peak = computed(() => Math.max(...this.quote().lines.map((l) => l.runningTotal)));
  protected readonly money = money;
  protected readonly change = change;
  protected readonly longDate = longDate;

  protected effectClass(line: QuoteLine) {
    return `num effect ${line.amount < 0 ? 'down' : line.amount > 0 ? 'up' : ''}`;
  }
}
