# web/react

The React and TypeScript front end for the Fenmoor Motor quote demo. Plain React state, no form
library and no state library. The insurer is fictional, the prices are illustrative, and nothing
a visitor types is stored.

It calls the API in `src/Fenmoor.Api`: `GET /api/vehicles` and `POST /api/quote`. The types for
both come from `contracts/openapi.yaml`, generated into `../shared/api.d.ts`.

    npm ci
    npm run dev          # Vite, proxying /api to the Functions host on http://localhost:7071
    npm test             # Vitest
    npm run typecheck
    npm run contract     # regenerate ../shared/api.d.ts from contracts/openapi.yaml
    npm run build

The root README says how to run the whole thing.
