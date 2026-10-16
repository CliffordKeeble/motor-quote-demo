import type { Answers, QuoteRequest } from './types';

export type Errors = Partial<Record<keyof QuoteRequest, string>>;

// The browser's checks are for the person. The server checks every one of them again, with
// these same messages, and is the one that decides (api/Fenmoor.Api QuoteValidator).

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

const whole = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function validateStep(step: number, a: Answers): Errors {
  const e: Errors = {};

  if (step === 0) {
    if (!a.vehicleId) e.vehicleId = 'Choose your car';
    const value = whole(a.carValue.replace(/[£,]/g, ''));
    if (Number.isNaN(value)) e.carValue = 'Enter the car’s value in whole pounds, like 12000';
    else if (value < 500 || value > 250000) e.carValue = 'Enter a value between £500 and £250,000';
    if (!a.overnight) e.overnight = 'Choose where the car is kept overnight';
    if (!a.mileage) e.mileage = 'Choose your annual mileage';
    if (!a.use) e.use = 'Choose what the car is used for';
  }

  if (step === 1) {
    const age = a.dateOfBirth ? ageOn(a.dateOfBirth, today()) : NaN;
    if (!a.dateOfBirth) e.dateOfBirth = 'Enter your date of birth';
    else if (age < 17) e.dateOfBirth = 'You need to be 17 or over to get a quote';
    else if (age > 99) e.dateOfBirth = 'Check the year of your date of birth';

    const licence = whole(a.licenceYears);
    if (Number.isNaN(licence)) e.licenceYears = 'Enter the number of whole years, like 5';
    else if (!Number.isNaN(age) && licence > age - 17) {
      const most = Math.max(age - 17, 0);
      e.licenceYears = `At ${age} you can have held a licence for ${most} ${most === 1 ? 'year' : 'years'} at most`;
    }

    if (!POSTCODE.test(a.postcode.trim())) e.postcode = 'Enter a full UK postcode, like PE38 9AB';

    const ncd = whole(a.noClaimsYears);
    if (Number.isNaN(ncd)) e.noClaimsYears = 'Enter the number of whole years, like 4';
    else if (!Number.isNaN(licence) && ncd > licence) e.noClaimsYears = 'No-claims years can’t be more than the years you’ve held a licence';

    if (a.claimsLast5Years === '') e.claimsLast5Years = 'Choose how many claims you’ve made';
  }

  if (step === 2) {
    if (!a.cover) e.cover = 'Choose a level of cover';
    if (a.voluntaryExcess === '') e.voluntaryExcess = 'Choose a voluntary excess';
    if (!a.startDate) e.startDate = 'Enter the date you want cover to start';
    else if (a.startDate < today() || a.startDate > addDays(today(), 30))
      e.startDate = 'Choose a start date from today up to 30 days ahead';
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
