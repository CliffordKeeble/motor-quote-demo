import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The headers the hosted app sends, from the one file that defines them.
const hosted = JSON.parse(readFileSync(new URL('./public/staticwebapp.config.json', import.meta.url), 'utf8'));

// The Azure Functions host, as `func start` or Visual Studio runs it.
const proxy = { '/api': 'http://localhost:7071' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  // `vite preview` serves the built page. Giving it the hosted headers means the build can be
  // run under its Content-Security-Policy here, before it is deployed.
  preview: { proxy, headers: hosted.globalHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
