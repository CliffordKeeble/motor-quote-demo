import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, ageOn, emptyAnswers, exampleAnswers, toRequest, today, validateStep } from '@shared/validation';
import type { Answers } from '@shared/types';

// 12:00 UTC on 16 October 2026: 13:00 in London, the same date.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const valid = (): Answers => ({ ...exampleAnswers(), startDate: '2026-10-23' });
const withAnswer = (field: keyof Answers, value: string): Answers => ({ ...valid(), [field]: value });

// Each row: the spoiled answer, and the message the person sees (and the server sends: its
// QuoteValidator has the same words).
describe('step 1, your car', () => {
  it.each<[keyof Answers, string, string]>([
    ['vehicleId', '', 'Choose your car'],
    ['carValue', '', 'Enter the car’s value in whole pounds, like 12000'],
    ['carValue', 'lots', 'Enter the car’s value in whole pounds, like 12000'],
    ['carValue', '499', 'Enter a value between £500 and £250,000'],
    ['carValue', '250001', 'Enter a value between £500 and £250,000'],
    ['overnight', '', 'Choose where the car is kept overnight'],
    ['mileage', '', 'Choose your annual mileage'],
    ['use', '', 'Choose what the car is used for'],
  ])('%s of "%s" says: %s', (field, value, message) => {
    expect(validateStep(0, withAnswer(field, value))).toEqual({ [field]: message });
  });

  it('takes pounds with a sign and commas', () => {
    expect(validateStep(0, withAnswer('carValue', '£14,500'))).toEqual({});
  });

  it('accepts the worked example', () => {
    expect(validateStep(0, valid())).toEqual({});
  });
});

describe('step 2, about you', () => {
  it.each<[keyof Answers, string, string]>([
    ['dateOfBirth', '', 'Enter your date of birth'],
    ['dateOfBirth', '1926-10-15', 'Check the year of your date of birth'],
    ['licenceYears', '', 'Enter the number of whole years, like 5'],
    ['licenceYears', '2.5', 'Enter the number of whole years, like 5'],
    ['licenceYears', '26', 'At 42 you can have held a licence for 25 years at most'],
    ['postcode', '', 'Enter a full UK postcode, like PE38 9AB'],
    ['postcode', 'PE38', 'Enter a full UK postcode, like PE38 9AB'],
    ['noClaimsYears', '', 'Enter the number of whole years, like 4'],
    ['noClaimsYears', '21', 'No-claims years can’t be more than the years you’ve held a licence'],
    ['claimsLast5Years', '', 'Choose how many claims you’ve made'],
  ])('%s of "%s" says: %s', (field, value, message) => {
    expect(validateStep(1, withAnswer(field, value))).toEqual({ [field]: message });
  });

  it('refuses someone who turns 17 tomorrow, and takes someone who turns 17 today', () => {
    const tomorrow = validateStep(1, { ...valid(), dateOfBirth: '2009-10-17', licenceYears: '0', noClaimsYears: '0' });
    const today17 = validateStep(1, { ...valid(), dateOfBirth: '2009-10-16', licenceYears: '0', noClaimsYears: '0' });

    expect(tomorrow).toEqual({ dateOfBirth: 'You need to be 17 or over to get a quote', licenceYears: 'At 16 you can have held a licence for 0 years at most' });
    expect(today17).toEqual({});
  });

  it('says 1 year, not 1 years, when the most is one', () => {
    expect(validateStep(1, { ...valid(), dateOfBirth: '2008-01-01', licenceYears: '2', noClaimsYears: '0' }))
      .toEqual({ licenceYears: 'At 18 you can have held a licence for 1 year at most' });
  });

  it('takes a postcode in any case, with or without the space', () => {
    expect(validateStep(1, withAnswer('postcode', 'pe389ab'))).toEqual({});
    expect(validateStep(1, withAnswer('postcode', ' EC1A 1BB '))).toEqual({});
  });

  it('accepts the worked example', () => {
    expect(validateStep(1, valid())).toEqual({});
  });
});

describe('step 3, your cover', () => {
  it.each<[keyof Answers, string, string]>([
    ['cover', '', 'Choose a level of cover'],
    ['voluntaryExcess', '', 'Choose a voluntary excess'],
    ['startDate', '', 'Enter the date you want cover to start'],
    ['startDate', '2026-10-15', 'Choose a start date from today up to 30 days ahead'],
    ['startDate', '2026-11-16', 'Choose a start date from today up to 30 days ahead'],
  ])('%s of "%s" says: %s', (field, value, message) => {
    expect(validateStep(2, withAnswer(field, value))).toEqual({ [field]: message });
  });

  it('takes today and 30 days ahead', () => {
    expect(validateStep(2, withAnswer('startDate', '2026-10-16'))).toEqual({});
    expect(validateStep(2, withAnswer('startDate', '2026-11-15'))).toEqual({});
  });

  it('asks nothing of an empty form that the step does not ask', () => {
    expect(Object.keys(validateStep(2, emptyAnswers)).sort()).toEqual(['cover', 'startDate', 'voluntaryExcess']);
  });
});

describe('dates', () => {
  it('today is the London date, not the UTC date', () => {
    // 23:30 UTC on 23 October is 00:30 BST on the 24th.
    expect(today(new Date('2026-10-23T23:30:00Z'))).toBe('2026-10-24');
    expect(today(new Date('2026-12-01T23:30:00Z'))).toBe('2026-12-01');
  });

  it('counts days in calendar days across the clocks changing', () => {
    expect(addDays('2026-10-16', 30)).toBe('2026-11-15');
    expect(addDays('2026-03-20', 10)).toBe('2026-03-30');
    expect(addDays('2026-12-25', 10)).toBe('2027-01-04');
  });

  it('counts a birthday on the day itself', () => {
    expect(ageOn('1984-03-12', '2026-10-23')).toBe(42);
    expect(ageOn('2005-10-23', '2026-10-23')).toBe(21);
    expect(ageOn('2005-10-24', '2026-10-23')).toBe(20);
  });
});

describe('the request sent to the API', () => {
  it('is the worked example in the contract’s shape', () => {
    expect(toRequest(valid())).toEqual({
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
      startDate: '2026-10-23',
      breakdown: true,
      legalExpenses: false,
    });
  });

  it('tidies the postcode and the pounds', () => {
    const request = toRequest({ ...valid(), postcode: ' pe38 9ab ', carValue: '£14,500' });

    expect(request.postcode).toBe('PE38 9AB');
    expect(request.carValue).toBe(14500);
  });
});
