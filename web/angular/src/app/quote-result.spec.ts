import { render, screen, within } from '@testing-library/angular';
import type { Quote } from '@shared/types';
import golden from '../../../../contracts/examples/quote-worked-example.json';
import { QuoteResult } from './quote-result';

// The golden file is the exact body the C# API returns for the worked example. The C# tests
// produce it byte for byte; this renders the same bytes, as the React app's test does.
const quote = golden as unknown as Quote;

const pounds = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const renderGolden = () =>
  render(QuoteResult, {
    inputs: { quote, coverFor: 'Comprehensive cover for your Volkswagen Golf 1.5 TSI Life' },
  });

describe('the worked example, rendered from the golden file', () => {
  it('shows £227.19 a year, £20.45 a month, the reference and the date it is valid to', async () => {
    await renderGolden();

    expect(screen.getByText(/227\.19/, { selector: '.price' })).toHaveTextContent('£227.19 a year');
    expect(screen.getByText(/12 payments of £20\.45/)).toBeInTheDocument();
    expect(screen.getByText(/Quote reference FM-ABC123, valid until 15 November 2026/)).toBeInTheDocument();
  });

  it('shows every line: its label, its answer and its running total', async () => {
    await renderGolden();

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

  it('ends on £227.19 in the total row', async () => {
    await renderGolden();

    const footer = screen.getByRole('table').querySelector('tfoot')!;
    expect(footer).toHaveTextContent(exactly('Total for the year£227.19'));
  });

  it('says what a claim costs: £250 compulsory and £250 voluntary', async () => {
    await renderGolden();

    expect(
      screen.getByText(/You pay the first £500\.00 of any claim: a compulsory £250\.00 and the voluntary £250\.00 you chose/),
    ).toBeInTheDocument();
  });

  it('draws each running total as a bar, as a share of the highest', async () => {
    await renderGolden();

    const bars = [...document.querySelectorAll<HTMLElement>('.working .bar')];
    const peak = Math.max(...quote.lines.map((l) => l.runningTotal));
    expect(bars.map((b) => b.style.width)).toEqual(quote.lines.map((l) => `${(l.runningTotal / peak) * 100}%`));
  });
});
