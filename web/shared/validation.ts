import type { Answers, QuoteRequest } from './types';
import { postcodeArea, ukPostcodeAreas } from './postcodeAreas';

export type Errors = Partial<Record<keyof QuoteRequest, string>>;

// The browser's checks are for the person. The server checks every one of them again, with
// these same messages, and is the one that decides (api/Fenmoor.Api QuoteValidator).
// Both front ends, web/react and web/angular, import this one file, so they cannot drift apart.

const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

// Today's date in London, as yyyy-mm-dd: the same "today" the server uses, so a start date the
// form accepts is one the server accepts.
export const today = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Whole years old on a given day (both yyyy-mm-dd). A birthday on that day counts.
export function ageOn(dateOfBirth: string, on: string): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const [year, month, day] = on.split('-').map(Number);
  const beforeBirthday = month < birthMonth || (month === birthMonth && day < birthDay);
  return year - birthYear - (beforeBirthday ? 1 : 0);
}

// The first day on which ageOn says `age`: the birthday, except for a 29 February birth in a
// common year, where it is 1 March (on 28 February ageOn still says the age before). The server's
// RatingEngine.FirstDayAged is defined the same way.
export function firstDayAged(dateOfBirth: string, age: number): string {
  const [birthYear, birthMonth] = dateOfBirth.split('-').map(Number);
  let day = `${String(birthYear + age).padStart(4, '0')}-${String(birthMonth).padStart(2, '0')}-01`;
  while (ageOn(dateOfBirth, day) < age) day = addDays(day, 1);
  return day;
}

// A calendar date in en-GB long form, like 5 November 2026. Read in UTC, as a plain date.
export const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// A real calendar date written yyyy-mm-dd, as a date input gives it. Anything else (an address
// edited by hand can carry anything) is treated as no answer, as the server treats it.
function isDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split('-').map(Number);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// The values each choice can take: the contract's own (contracts/openapi.yaml, through api.d.ts,
// so a value added there or taken away fails the type check here). A value the form could not
// produce is treated as no answer, as the server treats it.
const choices: { [K in 'overnight' | 'mileage' | 'use' | 'cover' | 'claimsLast5Years' | 'voluntaryExcess']: Record<QuoteRequest[K], true> } = {
  overnight: { garage: true, driveway: true, street: true },
  mileage: { under5k: true, '5to10k': true, '10to15k': true, over15k: true },
  use: { social: true, commuting: true, business: true },
  cover: { comprehensive: true, tpft: true, tpo: true },
  claimsLast5Years: { 0: true, 1: true, 2: true },
  voluntaryExcess: { 0: true, 100: true, 250: true, 500: true },
};
const chosen = (field: keyof typeof choices, a: Answers) => Object.hasOwn(choices[field], a[field]);

const whole = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

// The date of birth's own checks. Judged on the last start date allowed, as the price is judged on
// the start date: someone who is 16 today and 17 within 30 days can start cover on or after the
// birthday (step 3 holds them to it).
function dateOfBirthError(dateOfBirth: string): string | undefined {
  if (!isDate(dateOfBirth)) return 'Enter your date of birth';
  if (ageOn(dateOfBirth, addDays(today(), 30)) < 17) return 'You need to be 17 within the next 30 days to get a quote';
  if (ageOn(dateOfBirth, today()) > 99) return 'Check the year of your date of birth';
  return undefined;
}

export function validateStep(step: number, a: Answers): Errors {
  const e: Errors = {};

  if (step === 0) {
    if (!a.vehicleId) e.vehicleId = 'Choose your car';
    const value = whole(a.carValue.replace(/[£,]/g, ''));
    if (Number.isNaN(value)) e.carValue = 'Enter the car’s value in whole pounds, like 12000';
    else if (value < 500 || value > 250000) e.carValue = 'Enter a value between £500 and £250,000';
    if (!chosen('overnight', a)) e.overnight = 'Choose where the car is kept overnight';
    if (!chosen('mileage', a)) e.mileage = 'Choose your annual mileage';
    if (!chosen('use', a)) e.use = 'Choose what the car is used for';
  }

  if (step === 1) {
    const dateOfBirth = dateOfBirthError(a.dateOfBirth);
    if (dateOfBirth) e.dateOfBirth = dateOfBirth;

    // The licence is judged only on a date of birth that passed: an age that was refused says
    // nothing about how long a licence can have been held.
    const licence = whole(a.licenceYears);
    if (Number.isNaN(licence)) e.licenceYears = 'Enter the number of whole years, like 5';
    else if (!dateOfBirth) {
      const age = ageOn(a.dateOfBirth, today());
      const most = Math.max(age - 17, 0);
      if (licence > most) e.licenceYears = `At ${age} you can have held a licence for ${most} ${most === 1 ? 'year' : 'years'} at most`;
    }

    if (!POSTCODE.test(a.postcode.trim())) e.postcode = 'Enter a full UK postcode, like PE38 9AB';
    else if (!ukPostcodeAreas.has(postcodeArea(a.postcode)))
      e.postcode = 'We don’t recognise that postcode area. Enter a full UK postcode, like PE38 9AB';

    const ncd = whole(a.noClaimsYears);
    if (Number.isNaN(ncd)) e.noClaimsYears = 'Enter the number of whole years, like 4';
    else if (!Number.isNaN(licence) && ncd > licence) e.noClaimsYears = 'No-claims years can’t be more than the years you’ve held a licence';

    if (!chosen('claimsLast5Years', a)) e.claimsLast5Years = 'Choose how many claims you’ve made';
  }

  if (step === 2) {
    if (!chosen('cover', a)) e.cover = 'Choose a level of cover';
    if (!chosen('voluntaryExcess', a)) e.voluntaryExcess = 'Choose a voluntary excess';
    if (!isDate(a.startDate)) e.startDate = 'Enter the date you want cover to start';
    else if (a.startDate < today() || a.startDate > addDays(today(), 30))
      e.startDate = 'Choose a start date from today up to 30 days ahead';
    else if (!dateOfBirthError(a.dateOfBirth)) {
      // Cover can start on the 17th birthday at the earliest. Only on a valid date of birth, which
      // step 2 has already checked; a refused one is that step's message, not this one.
      const seventeenth = firstDayAged(a.dateOfBirth, 17);
      if (a.startDate < seventeenth) e.startDate = `Choose a start date on or after your 17th birthday, ${longDate(seventeenth)}`;
    }
  }

  return e;
}

export function toRequest(a: Answers): QuoteRequest {
  return {
    vehicleId: a.vehicleId,
    carValue: Number(a.carValue.replace(/[£,]/g, '')),
    overnight: a.overnight as QuoteRequest['overnight'],
    mileage: a.mileage as QuoteRequest['mileage'],
    use: a.use as QuoteRequest['use'],
    dateOfBirth: a.dateOfBirth,
    licenceYears: Number(a.licenceYears),
    postcode: a.postcode.trim().toUpperCase(),
    noClaimsYears: Number(a.noClaimsYears),
    claimsLast5Years: Number(a.claimsLast5Years) as QuoteRequest['claimsLast5Years'],
    cover: a.cover as QuoteRequest['cover'],
    voluntaryExcess: Number(a.voluntaryExcess) as QuoteRequest['voluntaryExcess'],
    startDate: a.startDate,
    breakdown: a.breakdown === 'true',
    legalExpenses: a.legalExpenses === 'true',
  };
}

export const emptyAnswers: Answers = {
  vehicleId: '', carValue: '', overnight: '', mileage: '', use: '',
  dateOfBirth: '', licenceYears: '', postcode: '', noClaimsYears: '', claimsLast5Years: '',
  cover: '', voluntaryExcess: '', startDate: '', breakdown: 'false', legalExpenses: 'false',
};

export const exampleAnswers = (): Answers => ({
  vehicleId: 'vw-golf-2021', carValue: '14500', overnight: 'driveway', mileage: '5to10k', use: 'commuting',
  dateOfBirth: '1984-03-12', licenceYears: '20', postcode: 'PE38 9AB', noClaimsYears: '6', claimsLast5Years: '0',
  cover: 'comprehensive', voluntaryExcess: '250', startDate: addDays(today(), 7), breakdown: 'true', legalExpenses: 'false',
});

// Which step each answer is asked on, so that a refusal from the server can take the person
// back to the first step that has one.
export const stepOf: Record<keyof Answers, number> = {
  vehicleId: 0, carValue: 0, overnight: 0, mileage: 0, use: 0,
  dateOfBirth: 1, licenceYears: 1, postcode: 1, noClaimsYears: 1, claimsLast5Years: 1,
  cover: 2, voluntaryExcess: 2, startDate: 2, breakdown: 2, legalExpenses: 2,
};
