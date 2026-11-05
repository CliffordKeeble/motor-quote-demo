/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { liveSites, otherSite, readSwitch, switchFragment } from '@shared/switch';
import { emptyAnswers, exampleAnswers } from '@shared/validation';

// web/shared/switch.ts is used by both front ends; its own tests run here, as validation.ts's do.

// The live addresses are written in five files, and docs/DEPLOY.md (step 5) names them. These
// tests read the repository, so a changed address left behind in one of them goes red.
const repo = join(import.meta.dirname, '../../..');
const hostnames = Object.values(liveSites).map((site) => new URL(site).hostname);
const anyLiveHostname = /[a-z0-9-]+\.\d+\.azurestaticapps\.net/g;
// Not the repository's own files: what a build, an install or a tool leaves in the tree. Every folder
// whose name starts with a dot is skipped too (.git, and .claude, where a worktree is a whole copy).
const skipped = new Set(['node_modules', 'dist', 'bin', 'obj', 'test-results', 'playwright-report']);

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return skipped.has(entry.name) || entry.name.startsWith('.') ? [] : filesUnder(join(dir, entry.name));
    return [join(dir, entry.name)];
  });
}

describe('the live addresses', () => {
  it('are the same in the pipeline as in liveSites', () => {
    const pipeline = readFileSync(join(repo, 'azure-pipelines.yml'), 'utf8');

    expect(pipeline.match(/^\s*siteUrl:\s*(\S+)\s*$/m)?.[1]).toBe(liveSites.react);
    expect(pipeline.match(/^\s*angularSiteUrl:\s*(\S+)\s*$/m)?.[1]).toBe(liveSites.angular);
  });

  it('are written in the five files DEPLOY.md names, and only ever as the two in liveSites', () => {
    const found = new Map<string, string[]>();
    for (const file of filesUnder(repo)) {
      const text = readFileSync(file, 'utf8');
      const names = text.match(anyLiveHostname);
      if (names) found.set(relative(repo, file).split(sep).join('/'), names);
    }

    expect([...found.keys()].sort()).toEqual(
      ['README.md', 'azure-pipelines.yml', 'docs/DEPLOY.md', 'tools/smoke_live.py', 'web/shared/switch.ts'],
    );
    for (const [file, names] of found) {
      for (const name of names) expect(hostnames, `${name} in ${file}`).toContain(name);
    }
  });
});

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
