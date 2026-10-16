import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import golden from '../../../contracts/examples/quote-worked-example.json';
import App from './App';
import type { Vehicle } from './types';

const vehicles: Vehicle[] = [
  { id: 'ford-fiesta-2019', make: 'Ford', model: 'Fiesta 1.0 EcoBoost Titanium', year: 2019, fuel: 'Petrol', group: 12 },
  { id: 'toyota-yaris-2022', make: 'Toyota', model: 'Yaris 1.5 Hybrid Design', year: 2022, fuel: 'Hybrid', group: 13 },
  { id: 'vw-golf-2021', make: 'Volkswagen', model: 'Golf 1.5 TSI Life', year: 2021, fuel: 'Petrol', group: 17 },
  { id: 'nissan-leaf-2020', make: 'Nissan', model: 'Leaf 40kWh Acenta', year: 2020, fuel: 'Electric', group: 21 },
  { id: 'bmw-320d-2020', make: 'BMW', model: '320d M Sport', year: 2020, fuel: 'Diesel', group: 30 },
  { id: 'tesla-model3-2023', make: 'Tesla', model: 'Model 3 Long Range', year: 2023, fuel: 'Electric', group: 48 },
];

const json = (body: unknown, status = 200, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } });
const problem = (errors: Record<string, string[]>) => json({ status: 400, errors }, 400, 'application/problem+json');

type Handler = (body: unknown) => Response | Promise<Response>;

// The API, as the browser sees it. GET /api/vehicles always answers; POST /api/quote is the test's.
function stubApi(onQuote: Handler) {
  const posted: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/vehicles') return json(vehicles);
      if (url === '/api/quote') {
        const body = JSON.parse(String(init?.body));
        posted.push(body);
        return onQuote(body);
      }
      throw new Error(`unexpected request to ${url}`);
    }),
  );
  return posted;
}

// Fill in the example answers and press through to the quote.
async function getQuote(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await screen.findByRole('option', { name: /Golf/ });
  await user.click(screen.getByRole('button', { name: 'Fill in example answers' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Get my quote' }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('the journey against the API', () => {
  it('shows the quote the API returns, and sends the answers in the contract’s shape', async () => {
    const posted = stubApi(() => json(golden));

    await getQuote(userEvent.setup());

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
    expect(screen.getByText(/227\.19/, { selector: '.price' })).toBeInTheDocument();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      vehicleId: 'vw-golf-2021',
      carValue: 14500,
      overnight: 'driveway',
      mileage: '5to10k',
      use: 'commuting',
      dateOfBirth: '1984-03-12',
      licenceYears: 20,
      postcode: 'PE38 9AB',
      noClaimsYears: 6,
      claimsLast5Years: 0,
      cover: 'comprehensive',
      voluntaryExcess: 250,
      breakdown: true,
      legalExpenses: false,
    });
  });

  it('says it is working out the price while it waits', async () => {
    let answer: (response: Response) => void = () => {};
    stubApi(() => new Promise<Response>((resolve) => (answer = resolve)));

    await getQuote(userEvent.setup());

    expect(await screen.findByRole('status')).toHaveTextContent('Working out your price');
    expect(screen.getByRole('button', { name: /Working out your price/ })).toBeDisabled();

    answer(json(golden));
    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('when the server refuses an answer the browser let through (400)', () => {
  it('puts the server’s message on its field and takes the person back to that step', async () => {
    stubApi(() => problem({ postcode: ['The server did not like this postcode'] }));

    await getQuote(userEvent.setup());

    expect(await screen.findByRole('heading', { name: 'Tell us about you' })).toBeInTheDocument();
    expect(screen.getByText('The server did not like this postcode')).toBeInTheDocument();
    expect(screen.getByLabelText('Where is the car kept?')).toHaveAccessibleDescription(/The server did not like this postcode/);
    expect(screen.getByRole('alert')).toHaveTextContent('One answer needs changing');
  });

  it('goes to the first step that has a refused answer, and shows each message on its field', async () => {
    stubApi(() => problem({ startDate: ['No start date for you'], vehicleId: ['No such car'], postcode: ['No such postcode'] }));
    const user = userEvent.setup();

    await getQuote(user);

    expect(await screen.findByRole('heading', { name: 'Tell us about your car' })).toBeInTheDocument();
    expect(screen.getByText('No such car')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('3 answers need changing');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('No such postcode')).toBeInTheDocument();
  });

  it('clears a message when the person changes that answer', async () => {
    stubApi(() => problem({ postcode: ['The server did not like this postcode'] }));
    const user = userEvent.setup();
    await getQuote(user);
    await screen.findByText('The server did not like this postcode');

    await user.type(screen.getByLabelText('Where is the car kept?'), '2');

    expect(screen.queryByText('The server did not like this postcode')).not.toBeInTheDocument();
  });
});

describe('when the quote cannot be had', () => {
  it.each([
    ['the network fails', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['the server fails (500)', () => new Response('boom', { status: 500 })],
    ['the server sends something that is not a quote or a refusal', () => new Response('<html>', { status: 400 })],
  ])('keeps every answer when %s', async (_name, respond) => {
    stubApi(respond);
    const user = userEvent.setup();

    await getQuote(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t work out your price just now');
    expect(screen.getByRole('heading', { name: 'Choose your cover' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Comprehensive/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '£250' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Where is the car kept?')).toHaveValue('PE38 9AB');
    expect(screen.getByLabelText('Your date of birth')).toHaveValue('1984-03-12');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lets the person try again after a failure', async () => {
    let calls = 0;
    stubApi(() => (++calls === 1 ? new Response('boom', { status: 500 }) : json(golden)));
    const user = userEvent.setup();
    await getQuote(user);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Get my quote' }));

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
  });
});

describe('the sample cars', () => {
  it('come from GET /api/vehicles', async () => {
    stubApi(() => json(golden));

    render(<App />);

    expect(await screen.findByRole('option', { name: /Volkswagen Golf 1\.5 TSI Life \(2021\), petrol/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(vehicles.length + 1);
  });

  it('can be fetched again if the first try failed', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => (fail ? Promise.reject(new TypeError('Failed to fetch')) : json(vehicles))),
    );
    const user = userEvent.setup();

    render(<App />);
    expect(await screen.findByText(/We couldn’t load the sample cars/)).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(vehicles.length + 1));
    expect(screen.queryByText(/We couldn’t load the sample cars/)).not.toBeInTheDocument();
  });
});
