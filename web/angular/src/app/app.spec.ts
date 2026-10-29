import { provideHttpClient, withFetch } from '@angular/common/http';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { liveSites, switchFragment } from '@shared/switch';
import type { Vehicle } from '@shared/types';
import { exampleAnswers } from '@shared/validation';
import golden from '../../../../contracts/examples/quote-worked-example.json';
import { App } from './app';

// The same journey tests as the React app's App.test.tsx, against the same stubbed fetch: the
// Angular app's HttpClient is set to use fetch, so both front ends meet the API the same way.

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

const urlOf = (input: RequestInfo | URL) => (typeof input === 'string' ? input : input instanceof URL ? input.pathname : new URL(input.url).pathname);

// The API, as the browser sees it. GET /api/vehicles always answers; POST /api/quote is the test's.
function stubApi(onQuote: Handler) {
  const posted: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);
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

const renderApp = () => render(App, { providers: [provideHttpClient(withFetch())] });

// Fill in the example answers and press through to the quote.
async function getQuote(user: ReturnType<typeof userEvent.setup>) {
  await renderApp();
  await screen.findByRole('option', { name: /Golf/ });
  await user.click(screen.getByRole('button', { name: 'Fill in example answers' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(await screen.findByRole('button', { name: 'Continue' }));
  await user.click(await screen.findByRole('button', { name: 'Get my quote' }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('the journey against the API', () => {
  it('shows the quote the API returns, and sends the answers in the contract’s shape', async () => {
    const posted = stubApi(() => json(golden));

    await getQuote(userEvent.setup());

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
    expect(screen.getByText(/227\.19/, { selector: '.price' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comprehensive cover for your Volkswagen Golf 1.5 TSI Life' })).toBeInTheDocument();
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

  it('goes back to the first step with the answers kept when the person asks to change them', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();
    await getQuote(user);

    await user.click(await screen.findByRole('button', { name: 'Change your answers' }));

    expect(await screen.findByRole('heading', { name: 'Tell us about your car' })).toBeInTheDocument();
    expect(screen.getByLabelText('What is the car worth today?')).toHaveValue('14500');
    expect(screen.getByRole('radio', { name: 'Driveway' })).toBeChecked();
  });

  it('starts again with nothing filled in', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();
    await getQuote(user);

    await user.click(await screen.findByRole('button', { name: 'Start a new quote' }));

    expect(await screen.findByRole('heading', { name: 'Tell us about your car' })).toBeInTheDocument();
    expect(screen.getByLabelText('What is the car worth today?')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Which car do you want to insure?' })).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'Driveway' })).not.toBeChecked();
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

    await waitFor(() => expect(screen.queryByText('The server did not like this postcode')).not.toBeInTheDocument());
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
    expect(await screen.findByLabelText('Where is the car kept?')).toHaveValue('PE38 9AB');
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

    await renderApp();

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

    await renderApp();
    expect(await screen.findByText(/We couldn’t load the sample cars/)).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(vehicles.length + 1));
    expect(screen.queryByText(/We couldn’t load the sample cars/)).not.toBeInTheDocument();
  });

  it('show the chosen car and its insurance group in the summary', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole('option', { name: /Golf/ });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Which car do you want to insure?' }), 'vw-golf-2021');

    const summary = screen.getByRole('complementary', { name: 'Your answers so far' });
    expect(summary).toHaveTextContent('Volkswagen Golf 1.5 TSI Life (2021)');
    expect(summary).toHaveTextContent('17 of 50');
  });
});

// UI test of the live demo, 18 Oct 2026 (board A20). Both seen on the deployed React site first.
describe('after a Continue that cannot go on', () => {
  it('clears the old messages when the example answers are filled in', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();

    await renderApp();
    await screen.findByRole('option', { name: /Golf/ });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('5 answers need changing');

    await user.click(screen.getByRole('button', { name: 'Fill in example answers' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.queryByText('Choose your car')).not.toBeInTheDocument();
  });

  it('moves focus to the message, so a phone shows it rather than staying at the button', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();

    await renderApp();
    await screen.findByRole('option', { name: /Golf/ });
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  });

  it('moves focus to the message when the quote cannot be had', async () => {
    stubApi(() => Promise.reject(new TypeError('Failed to fetch')));

    await getQuote(userEvent.setup());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t work out your price just now');
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it('moves focus to the new heading on each step', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole('option', { name: /Golf/ });
    await user.click(screen.getByRole('button', { name: 'Fill in example answers' }));

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Tell us about you' })).toHaveFocus());
  });
});

// The link to the same journey in the React app, and the way back from it (web/shared/switch.ts).
describe('switching between the Angular and the React page', () => {
  it('links to the React page with the step and the answers so far', async () => {
    stubApi(() => json(golden));
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole('option', { name: /Golf/ });
    await user.click(screen.getByRole('button', { name: 'Fill in example answers' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: 'Tell us about you' });

    const href = screen.getByRole('link', { name: 'Switch to React' }).getAttribute('href')!;
    expect(href.startsWith(`${liveSites.react}/#step=1&`)).toBe(true);
    expect(href).toContain('postcode=PE38+9AB');
  });

  it('opens on the step the React page carried, with its answers, and clears them from the address', async () => {
    stubApi(() => json(golden));
    window.history.replaceState(null, '', `/${switchFragment(1, exampleAnswers())}`);

    await renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: 'Tell us about you' })).toBeInTheDocument();
    expect(screen.getByLabelText('Where is the car kept?')).toHaveValue('PE38 9AB');
    expect(window.location.hash).toBe('');
    expect(await screen.findByText('Volkswagen Golf 1.5 TSI Life (2021)')).toBeInTheDocument();
  });
});
