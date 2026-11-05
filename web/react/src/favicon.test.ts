/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The favicon is served on every visit. A copy that crossed a file bridge once came back with a
// signed Content Credentials block in it, 8 KB around a 248-byte picture; this keeps it out.
describe('the favicon', () => {
  it.each(['react', 'angular'])('of the %s app is the picture alone, with no metadata', (app) => {
    const svg = readFileSync(join(import.meta.dirname, `../../${app}/public/favicon.svg`), 'utf8');

    expect(svg).not.toMatch(/c2pa|<metadata/i);
    expect(svg.length).toBeLessThan(1024);
  });
});
