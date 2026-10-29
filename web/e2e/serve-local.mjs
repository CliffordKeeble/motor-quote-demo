// Serves a built front end the way Azure Static Web Apps does, so the Playwright suite can run
// with no Azure: the headers from the app's own staticwebapp.config.json on every response (the
// Content-Security-Policy among them), index.html for any path that is not a file, and a stub of
// the API. The stub answers GET /api/vehicles with the engine's seven cars (fixtures/vehicles.json,
// from src/Fenmoor.Rating/Vehicle.cs) and POST /api/quote with the worked example's response
// (contracts/examples/quote-worked-example.json) for the worked example's answers only. It prices
// nothing: the engine is C# and the xUnit projects test it. Run against a deployed site, the same
// suite meets the real API.
//
//   node serve-local.mjs <built folder> <port>

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2]);
const port = Number(process.argv[3]);
const config = JSON.parse(await readFile(join(root, 'staticwebapp.config.json'), 'utf8'));
const vehicles = await readFile(new URL('./fixtures/vehicles.json', import.meta.url));
const golden = await readFile(new URL('../../contracts/examples/quote-worked-example.json', import.meta.url));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// The worked example's answers, less the start date, which the page sets a week ahead.
const workedExample = {
  vehicleId: 'vw-golf-2021', carValue: 14500, overnight: 'driveway', mileage: '5to10k', use: 'commuting',
  dateOfBirth: '1984-03-12', licenceYears: 20, postcode: 'PE38 9AB', noClaimsYears: 6, claimsLast5Years: 0,
  cover: 'comprehensive', voluntaryExcess: 250, breakdown: true, legalExpenses: false,
};

createServer(async (request, response) => {
  const send = (status, type, body) => {
    response.writeHead(status, { ...config.globalHeaders, 'Content-Type': type });
    response.end(body);
  };
  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/api/vehicles' && request.method === 'GET') return send(200, types['.json'], vehicles);
  if (url.pathname === '/api/quote' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const answers = JSON.parse(body);
    if (Object.entries(workedExample).every(([field, value]) => answers[field] === value)) {
      return send(200, types['.json'], golden);
    }
    const refusal = { status: 400, errors: { postcode: ['This stub of the API prices only the worked example'] } };
    return send(400, 'application/problem+json', JSON.stringify(refusal));
  }
  if (url.pathname.startsWith('/api/')) return send(404, 'text/plain', 'Not found');

  const path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (path !== root && !path.startsWith(root + sep)) return send(403, 'text/plain', 'Forbidden');
  try {
    if ((await stat(path)).isFile()) return send(200, types[extname(path)] ?? 'application/octet-stream', await readFile(path));
  } catch {
    // Not a file: the page itself answers, as navigationFallback has it.
  }
  send(200, types['.html'], await readFile(join(root, config.navigationFallback.rewrite)));
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
