/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, ageOn, emptyAnswers, exampleAnswers, firstDayAged, longDate, toRequest, today, validateStep } from '@shared/validation';
import { postcodeArea, ukPostcodeAreas } from '@shared/postcodeAreas';
// The server's list, read as text from the repository: the browser's copy must say the same.
const serverAreas = readFileSync(join(import.meta.dirname, '../../../src/Fenmoor.Rating/PostcodeAreas.cs'), 'utf8');
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

  it('takes someone who turns 17 in 30 days, and refuses someone who turns 17 in 31', () => {
    const young = (dateOfBirth: string) => ({ ...valid(), dateOfBirth, licenceYears: '0', noClaimsYears: '0' });

    expect(validateStep(1, young('2009-11-15'))).toEqual({});
    expect(validateStep(1, young('2009-11-16'))).toEqual({ dateOfBirth: 'You need to be 17 within the next 30 days to get a quote' });
  });

  it('holds a 16-year-old to no years of licence, and says so in the same words as before', () => {
    const sixteen = { ...valid(), dateOfBirth: '2009-10-26', noClaimsYears: '0' };

    expect(validateStep(1, { ...sixteen, licenceYears: '0' })).toEqual({});
    expect(validateStep(1, { ...sixteen, licenceYears: '1' })).toEqual({ licenceYears: 'At 16 you can have held a licence for 0 years at most' });
  });

  it('judges no licence against a date of birth it has refused: one message, not two', () => {
    expect(validateStep(1, { ...valid(), dateOfBirth: '2030-01-01', licenceYears: '0', noClaimsYears: '0' }))
      .toEqual({ dateOfBirth: 'You need to be 17 within the next 30 days to get a quote' });
    expect(validateStep(1, { ...valid(), dateOfBirth: '1926-10-15', licenceYears: '90', noClaimsYears: '0' }))
      .toEqual({ dateOfBirth: 'Check the year of your date of birth' });
  });

  it('refuses a postcode whose area is not one of the UK’s, in any case', () => {
    const outside = 'We don’t recognise that postcode area. Enter a full UK postcode, like PE38 9AB';

    expect(validateStep(1, withAnswer('postcode', 'ZZ99 9ZZ'))).toEqual({ postcode: outside });
    expect(validateStep(1, withAnswer('postcode', 'zz99 9zz'))).toEqual({ postcode: outside });
    expect(validateStep(1, withAnswer('postcode', 'GY1 1AA'))).toEqual({ postcode: outside });
    expect(validateStep(1, withAnswer('postcode', 'ZE1 0AA'))).toEqual({});
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

  it('holds the start date to the 17th birthday, and names the day', () => {
    const sixteen = { ...valid(), dateOfBirth: '2009-10-26', licenceYears: '0', noClaimsYears: '0' };

    expect(validateStep(2, { ...sixteen, startDate: '2026-10-25' }))
      .toEqual({ startDate: 'Choose a start date on or after your 17th birthday, 26 October 2026' });
    expect(validateStep(2, { ...sixteen, startDate: '2026-10-26' })).toEqual({});
  });

  it('says only the range when the start date is outside it, and nothing of the birthday on a refused date of birth', () => {
    const sixteen = { ...valid(), dateOfBirth: '2009-10-26' };

    expect(validateStep(2, { ...sixteen, startDate: '2026-10-15' })).toEqual({ startDate: 'Choose a start date from today up to 30 days ahead' });
    expect(validateStep(2, { ...valid(), dateOfBirth: '2030-01-01', startDate: '2026-10-16' })).toEqual({});
  });

  it('takes a 29 February birthday as 1 March in a common year', () => {
    vi.setSystemTime(new Date('2029-02-10T12:00:00Z'));
    const leapling = { ...valid(), dateOfBirth: '2012-02-29', licenceYears: '0', noClaimsYears: '0' };

    expect(validateStep(1, leapling)).toEqual({});
    expect(validateStep(2, { ...leapling, startDate: '2029-02-28' }))
      .toEqual({ startDate: 'Choose a start date on or after your 17th birthday, 1 March 2029' });
    expect(validateStep(2, { ...leapling, startDate: '2029-03-01' })).toEqual({});
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

// An address edited by hand can carry any value at all (web/shared/switch.ts reads the answers
// from it). A value the form could never produce is treated as no answer, as the server treats it.
describe('a value the form could not have produced', () => {
  it.each<[number, keyof Answers, string, string]>([
    [0, 'overnight', 'garden', 'Choose where the car is kept overnight'],
    [0, 'overnight', 'toString', 'Choose where the car is kept overnight'],
    [0, 'mileage', 'lots', 'Choose your annual mileage'],
    [0, 'use', 'racing', 'Choose what the car is used for'],
    [1, 'claimsLast5Years', '3', 'Choose how many claims you’ve made'],
    [1, 'dateOfBirth', 'yesterday', 'Enter your date of birth'],
    [1, 'dateOfBirth', '1984-02-30', 'Enter your date of birth'],
    [2, 'cover', 'everything', 'Choose a level of cover'],
    [2, 'voluntaryExcess', '50', 'Choose a voluntary excess'],
    [2, 'voluntaryExcess', '0250', 'Choose a voluntary excess'],
    [2, 'startDate', '2026-13-01', 'Enter the date you want cover to start'],
  ])('step %i, %s of "%s" says: %s', (step, field, value, message) => {
    expect(validateStep(step, withAnswer(field, value))).toEqual({ [field]: message });
  });

  it('takes every value the form offers', () => {
    for (const overnight of ['garage', 'driveway', 'street']) expect(validateStep(0, { ...valid(), overnight })).toEqual({});
    for (const mileage of ['under5k', '5to10k', '10to15k', 'over15k']) expect(validateStep(0, { ...valid(), mileage })).toEqual({});
    for (const use of ['social', 'commuting', 'business']) expect(validateStep(0, { ...valid(), use })).toEqual({});
    for (const claimsLast5Years of ['0', '1', '2']) expect(validateStep(1, { ...valid(), claimsLast5Years })).toEqual({});
    for (const cover of ['comprehensive', 'tpft', 'tpo']) expect(validateStep(2, { ...valid(), cover })).toEqual({});
    for (const voluntaryExcess of ['0', '100', '250', '500']) expect(validateStep(2, { ...valid(), voluntaryExcess })).toEqual({});
  });
});

describe('the UK’s postcode areas', () => {
  it('are the 121 geographic areas, without Guernsey, Jersey, the Isle of Man or the non-geographic codes', () => {
    expect(ukPostcodeAreas.size).toBe(121);
    for (const area of ['GY', 'JE', 'IM', 'BF', 'BX']) expect(ukPostcodeAreas.has(area)).toBe(false);
  });

  it('are the server’s list exactly (src/Fenmoor.Rating/PostcodeAreas.cs)', () => {
    const list = serverAreas.slice(serverAreas.indexOf('Uk {'), serverAreas.indexOf('ToFrozenSet'));
    const server = [...list.matchAll(/"([A-Z]{1,2})"/g)].map((m) => m[1]);

    expect(server).toHaveLength(121);
    expect([...ukPostcodeAreas].sort()).toEqual([...server].sort());
  });

  it('are read from the letters at the start of a postcode', () => {
    expect(postcodeArea(' pe38 9ab')).toBe('PE');
    expect(postcodeArea('B1 1AA')).toBe('B');
  });
});

describe('the 17th birthday', () => {
  it('is the first day ageOn says 17: the birthday, or 1 March for 29 February in a common year', () => {
    expect(firstDayAged('2009-10-26', 17)).toBe('2026-10-26');
    expect(firstDayAged('2009-10-01', 17)).toBe('2026-10-01');
    expect(firstDayAged('2012-02-29', 17)).toBe('2029-03-01');
    expect(firstDayAged('2012-02-29', 16)).toBe('2028-02-29');
    expect(ageOn('2012-02-29', '2029-02-28')).toBe(16);
  });

  it('is written in en-GB long form', () => {
    expect(longDate('2026-11-05')).toBe('5 November 2026');
    expect(longDate('2029-03-01')).toBe('1 March 2029');
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
