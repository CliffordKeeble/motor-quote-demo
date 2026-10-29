import { describe, expect, it } from 'vitest';
import { liveSites, otherSite, readSwitch, switchFragment } from '@shared/switch';
import { emptyAnswers, exampleAnswers } from '@shared/validation';

// web/shared/switch.ts is used by both front ends; its own tests run here, as validation.ts's do.

describe('the other site', () => {
  it('is the other live Static Web App', () => {
    const live = { hostname: 'example.net', port: '' };
    expect(otherSite('react', live)).toBe(liveSites.angular);
    expect(otherSite('angular', live)).toBe(liveSites.react);
  });

  it('is the other page of the pair on this machine', () => {
    expect(otherSite('react', { hostname: 'localhost', port: '5173' })).toBe('http://localhost:4200');
    expect(otherSite('angular', { hostname: 'localhost', port: '4200' })).toBe('http://localhost:5173');
    expect(otherSite('react', { hostname: 'localhost', port: '4301' })).toBe('http://localhost:4302');
    expect(otherSite('angular', { hostname: '127.0.0.1', port: '4302' })).toBe('http://127.0.0.1:4301');
  });

  it('is the live one from a port it does not know', () => {
    expect(otherSite('react', { hostname: 'localhost', port: '8080' })).toBe(liveSites.angular);
  });
});

describe('the answers a switch carries', () => {
  it('are the step and every answer given, readable in the address', () => {
    const fragment = switchFragment(1, exampleAnswers());

    expect(fragment).toMatch(/^#step=1&/);
    expect(fragment).toContain('vehicleId=vw-golf-2021');
    expect(fragment).toContain('postcode=PE38+9AB');
    expect(fragment).toContain('breakdown=true');
    expect(fragment).not.toContain('legalExpenses');
  });

  it('come back exactly as they went', () => {
    const answers = exampleAnswers();

    expect(readSwitch(switchFragment(2, answers))).toEqual({ step: 2, answers });
  });

  it('take the quote page back to the step before it', () => {
    expect(switchFragment(3, exampleAnswers())).toMatch(/^#step=2&/);
  });

  it('are nothing when the address carried none', () => {
    expect(readSwitch('')).toBeNull();
    expect(readSwitch('#')).toBeNull();
    expect(readSwitch('#vehicleId=vw-golf-2021')).toBeNull();
  });

  it('open on the first step whose answers fail, so an edited address skips no check', () => {
    expect(readSwitch('#step=2&vehicleId=vw-golf-2021')?.step).toBe(0);

    expect(readSwitch(switchFragment(2, { ...exampleAnswers(), postcode: '' }))?.step).toBe(1);
  });

  it('keep the step inside the journey, and ignore what is not an answer', () => {
    const answers = exampleAnswers();
    const fragment = switchFragment(2, answers).replace('step=2', 'step=9');

    expect(readSwitch(fragment)?.step).toBe(2);
    expect(readSwitch('#step=x')).toEqual({ step: 0, answers: emptyAnswers });
    expect(readSwitch(`${fragment}&admin=1`)?.answers).toEqual(answers);
  });
});
