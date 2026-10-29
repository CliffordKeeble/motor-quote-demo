import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import golden from '../../../../contracts/examples/quote-worked-example.json';
import type { Quote } from '@shared/types';
import { QuoteResult } from './QuoteResult';

// The golden file is the exact body the C# API returns for the worked example. The C# tests
// produce it byte for byte; this renders the same bytes.
const quote = golden as unknown as Quote;

const pounds = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

function renderGolden() {
  render(
    <QuoteResult
      quote={quote}
      coverFor="Comprehensive cover for your Volkswagen Golf 1.5 TSI Life"
      onChange={() => {}}
      onRestart={() => {}}
    />,
  );
}

describe('the worked example, rendered from the golden file', () => {
  it('shows £227.19 a year, £20.45 a month, the reference and the date it is valid to', () => {
    renderGolden();

    expect(screen.getByText(/227\.19/, { selector: '.price' })).toHaveTextContent('£227.19 a year');
    expect(screen.getByText(/12 payments of £20\.45/)).toBeInTheDocument();
    expect(screen.getByText(/Quote reference FM-ABC123, valid until 15 November 2026/)).toBeInTheDocument();
  });

  it('shows every line: its label, its answer and its running total', () => {
    renderGolden();

    const table = screen.getByRole('table');
    const body = table.querySelector('tbody')!;
    expect(within(body).getAllByRole('row')).toHaveLength(quote.lines.length);

    for (const line of quote.lines) {
      const row = within(body).getByRole('rowheader', { name: line.label }).closest('tr')!;
      const cells = within(row).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent(exactly(line.detail));
      expect(cells[2]).toHaveTextContent(exactly(pounds(line.runningTotal)));
    }
  });

  it('ends on £227.19 in the total row', () => {
    renderGolden();

    const footer = screen.getByRole('table').querySelector('tfoot')!;
    expect(footer).toHaveTextContent('Total for the year');
    expect(footer).toHaveTextContent(exactly('Total for the year£227.19'));
  });

  it('says what a claim costs: £250 compulsory and £250 voluntary', () => {
    renderGolden();

    expect(
      screen.getByText(/You pay the first £500\.00 of any claim: a compulsory £250\.00 and the voluntary £250\.00 you chose/),
    ).toBeInTheDocument();
  });
});
