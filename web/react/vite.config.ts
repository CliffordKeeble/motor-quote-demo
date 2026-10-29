import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The headers the hosted app sends, from the one file that defines them.
const hosted = JSON.parse(readFileSync(new URL('./public/staticwebapp.config.json', import.meta.url), 'utf8'));

// The Azure Functions host, as `func start` or Visual Studio runs it.
const proxy = { '/api': 'http://localhost:7071' };

// web/shared holds what both front ends use: the contract types, the browser's checks and the
// stylesheet. The alias resolves it at run time (tsconfig's paths only cover the type check), and
// the dev server is allowed to serve from it.
const shared = fileURLToPath(new URL('../shared', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': shared } },
  server: { proxy, fs: { allow: ['.', shared] } },
  // `vite preview` serves the built page. Giving it the hosted headers means the build can be
  // run under its Content-Security-Policy here, before it is deployed.
  preview: { proxy, headers: hosted.globalHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
