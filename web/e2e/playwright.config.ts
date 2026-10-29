import { defineConfig, devices } from '@playwright/test';

// One suite, run through each front end, on a desktop and on a phone.
//
// By default it serves the two built apps here (serve-local.mjs: the hosted headers and a stub
// of the API), so it runs with no Azure: build web/react and web/angular first. Set REACT_URL,
// ANGULAR_URL or both to run it against deployed sites and the real API instead; then only the
// front ends named are run.

const live = { react: process.env.REACT_URL, angular: process.env.ANGULAR_URL };
const isLive = Boolean(live.react || live.angular);
const local = { react: 'http://localhost:4301', angular: 'http://localhost:4302' };
const built = { react: '../react/dist', angular: '../angular/dist/motor-quote-angular/browser' };
const apps = (['react', 'angular'] as const).filter((app) => !isLive || live[app]);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }]] : 'list',
  // The live API's first quote after a quiet spell can take a few seconds.
  expect: { timeout: isLive ? 30_000 : 5_000 },
  use: { trace: 'retain-on-failure' },
  projects: apps.flatMap((app) => {
    const baseURL = isLive ? live[app] : local[app];
    return [
      { name: app, use: { ...devices['Desktop Chrome'], baseURL } },
      { name: `${app}-phone`, use: { ...devices['Pixel 7'], baseURL } },
    ];
  }),
  webServer: isLive
    ? undefined
    : apps.map((app) => ({
        command: `node serve-local.mjs ${built[app]} ${new URL(local[app]).port}`,
        url: local[app],
        reuseExistingServer: !process.env.CI,
      })),
});
