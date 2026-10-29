import type { Answers } from './types';
import { emptyAnswers, validateStep } from './validation';

// The link from one front end to the same journey in the other, with the answers kept.
//
// The answers travel after the # in the address. A browser never sends that part to a server,
// so the demo still stores nothing; the page that opens reads them, then takes them out of the
// address bar and out of that history entry (readSwitch's caller does that with replaceState).

export type FrontEnd = 'react' | 'angular';

export const frontEndNames: Record<FrontEnd, string> = { react: 'React', angular: 'Angular' };

export const other = (self: FrontEnd): FrontEnd => (self === 'react' ? 'angular' : 'react');

// Where each front end is live: the default hostnames of the two Static Web Apps
// (azure-pipelines.yml has the same two addresses for the check after each deploy).
export const liveSites: Record<FrontEnd, string> = {
  react: 'https://wonderful-mushroom-05443000f.6.azurestaticapps.net',
  angular: 'https://ashy-dune-08048570f.1.azurestaticapps.net',
};

// Run on this machine, the two pages are on localhost, in pairs: the dev servers (Vite on 5173,
// ng serve on 4200) or the Playwright suite's own (4301 and 4302). The same position in each
// list is the other page of the pair.
const localPorts: Record<FrontEnd, string[]> = { react: ['5173', '4301'], angular: ['4200', '4302'] };

export function otherSite(self: FrontEnd, here: { hostname: string; port: string }): string {
  const local = here.hostname === 'localhost' || here.hostname === '127.0.0.1';
  const pair = localPorts[self].indexOf(here.port);
  if (local && pair >= 0) return `http://${here.hostname}:${localPorts[other(self)][pair]}`;
  return liveSites[other(self)];
}

const fields = Object.keys(emptyAnswers) as (keyof Answers)[];

// The part after the #: the step and every answer given so far, as a query string, which can be
// read by eye. The quote page (step 3) is not carried: the other page opens on the step before it,
// with everything filled in, and asks the API itself.
export function switchFragment(step: number, answers: Answers): string {
  const params = new URLSearchParams({ step: String(Math.min(step, 2)) });
  for (const field of fields) {
    if (answers[field] !== emptyAnswers[field]) params.set(field, answers[field]);
  }
  return `#${params}`;
}

// The step and answers a switch carried, or null when the address carried none. The answers are
// checked with the same rules as the form: the page opens on the first step whose answers fail,
// so an address edited by hand cannot skip a check.
export function readSwitch(hash: string): { step: number; answers: Answers } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (!params.has('step')) return null;

  const answers: Answers = { ...emptyAnswers };
  for (const field of fields) {
    const value = params.get(field);
    if (value !== null) answers[field] = value;
  }
  const asked = Number(params.get('step'));
  const wanted = Number.isInteger(asked) ? Math.max(0, Math.min(asked, 2)) : 0;
  let step = 0;
  while (step < wanted && Object.keys(validateStep(step, answers)).length === 0) step++;
  return { step, answers };
}
