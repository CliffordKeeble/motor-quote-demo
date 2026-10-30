import { expect, test, type Page } from '@playwright/test';

// The quote journey, the same test for the React and the Angular front end (playwright.config.ts
// runs it through each). What it holds them to is the worked example: README.md, and
// contracts/examples/quote-worked-example.json, which is the API's exact response for it.

const framework = () => (test.info().project.name.startsWith('angular') ? 'Angular' : 'React');

// The worked example, line by line: what was looked at, the answer, the effect and the price so
// far. The age is a pattern because the live API works it out on the start date, a week from
// today; the price does not move until the driver is 50.
const workedExample: [string, string | RegExp, string, string][] = [
  ['Starting price', 'Comprehensive', '', '£400.00'],
  ['Your age', /^\d\d on the start date$/, 'no change', '£400.00'],
  ['Driving experience', '20 years with a full licence', 'no change', '£400.00'],
  ['Your car', 'Insurance group 17', '+4%', '£416.00'],
  ['Car value', '£14,500', 'no change', '£416.00'],
  ['Where you live', 'PE postcode area, band A', '−15%', '£353.60'],
  ['Where it is kept overnight', 'Driveway', 'no change', '£353.60'],
  ['Annual mileage', '5,000 to 10,000 miles', 'no change', '£353.60'],
  ['What the car is used for', 'Social and commuting', 'no change', '£353.60'],
  ['Claims in the last 5 years', '0', 'no change', '£353.60'],
  ['No-claims bonus', '6 years, 52% off', '−52%', '£169.73'],
  ['Voluntary excess', '£250', '−7%', '£157.85'],
  ['Breakdown cover', 'Added cover', '+£45.00', '£202.85'],
  ['Insurance Premium Tax', '12% on everything above', '+£24.34', '£227.19'],
];

// Anything the page logs as an error fails the test it happened in. A Content-Security-Policy
// refusal is logged this way, so this is what holds both front ends to the hosted policy.
let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
});
test.afterEach(() => {
  expect(problems, 'errors the page logged').toEqual([]);
});

async function open(page: Page) {
  const response = await page.goto('/');
  // Every option is in the list once GET /api/vehicles has answered.
  await expect(page.getByRole('option', { name: /Volkswagen Golf 1\.5 TSI Life \(2021\), petrol/ })).toBeAttached();
  return response;
}

async function fillInTheExample(page: Page) {
  await page.getByRole('button', { name: 'Fill in example answers' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tell us about you' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Choose your cover' })).toBeVisible();
}

test('is the front end it is meant to be, under the hosted Content-Security-Policy', async ({ page }) => {
  const response = await open(page);

  expect(response?.headers()['content-security-policy']).toContain("style-src 'self'");
  await expect(page.getByRole('contentinfo')).toContainText(`A demonstration of a quote journey in ${framework()} and TypeScript.`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tell us about your car');
});

test('prices the worked example at £227.19 a year, line by line', async ({ page }) => {
  await open(page);
  await fillInTheExample(page);
  await page.getByRole('button', { name: 'Get my quote' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Your quote' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comprehensive cover for your Volkswagen Golf 1.5 TSI Life' })).toBeVisible();
  await expect(page.locator('.price')).toHaveText('£227.19 a year');
  await expect(page.getByText('or 12 payments of £20.45, which includes an 8% charge for paying monthly')).toBeVisible();
  await expect(page.locator('.ref')).toHaveText(/^Quote reference FM-[A-Z0-9]+, valid until \d{1,2} [A-Z][a-z]+ \d{4}$/);

  const rows = page.locator('table.working tbody tr');
  await expect(rows).toHaveCount(workedExample.length);
  for (const [i, [label, answer, effect, soFar]] of workedExample.entries()) {
    const row = rows.nth(i);
    await expect(row.getByRole('rowheader')).toHaveText(label);
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toHaveText(answer);
    await expect(cells.nth(1)).toHaveText(effect);
    await expect(cells.nth(2)).toHaveText(soFar);
  }
  await expect(page.locator('table.working tfoot')).toHaveText(/^\s*Total for the year\s*£227\.19\s*$/);
  await expect(page.getByText('You pay the first £500.00 of any claim: a compulsory £250.00 and the voluntary £250.00 you chose.')).toBeVisible();
});

test('says what needs changing when Continue cannot go on, and brings the message into view', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Continue' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toHaveText('5 answers need changing before you can continue.');
  await expect(alert).toBeFocused();
  await expect(alert).toBeInViewport();
  await expect(page.getByText('Choose your car', { exact: true })).toBeVisible();
});

test('keeps every answer on the way back', async ({ page }) => {
  await open(page);
  await fillInTheExample(page);

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('Where is the car kept?')).toHaveValue('PE38 9AB');
  await expect(page.getByLabel('Your date of birth')).toHaveValue('1984-03-12');

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('Which car do you want to insure?')).toHaveValue('vw-golf-2021');
  await expect(page.getByLabel('What is the car worth today?')).toHaveValue('14500');
  await expect(page.getByRole('radio', { name: 'Driveway' })).toBeChecked();
  await expect(page.getByRole('complementary', { name: 'Your answers so far' })).toContainText('17 of 50');
});

test('switches to the other front end part way, keeps every answer, and finishes at £227.19', async ({ page }) => {
  // Each page links to the other: on this machine the other local server, deployed the other live
  // site (web/shared/switch.ts). Against deployed sites, both must be in the run.
  const isLive = Boolean(process.env.REACT_URL || process.env.ANGULAR_URL);
  test.skip(isLive && !(process.env.REACT_URL && process.env.ANGULAR_URL), 'only one front end is in this run');
  const here = framework();
  const there = here === 'React' ? 'Angular' : 'React';

  await open(page);
  await page.getByRole('button', { name: 'Fill in example answers' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tell us about you' })).toBeVisible();

  await page.getByRole('link', { name: `Switch to ${there}` }).click();

  await expect(page.getByRole('contentinfo')).toContainText(`A demonstration of a quote journey in ${there} and TypeScript.`);
  await expect(page.getByRole('heading', { level: 1, name: 'Tell us about you' })).toBeVisible();
  await expect(page.getByLabel('Where is the car kept?')).toHaveValue('PE38 9AB');
  await expect(page.getByLabel('Your date of birth')).toHaveValue('1984-03-12');
  await expect.poll(() => new URL(page.url()).hash, { message: 'the answers are out of the address bar' }).toBe('');
  await expect(page.getByRole('link', { name: `Switch to ${here}` })).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get my quote' }).click();
  await expect(page.locator('.price')).toHaveText('£227.19 a year');
});
