// The shapes the quote journey passes to the API and gets back are generated from
// contracts/openapi.yaml into web/shared/api.d.ts. These are only short names for them.
import type { components } from '@shared/api';

type Schemas = components['schemas'];

export type Vehicle = Schemas['Vehicle'];
export type QuoteRequest = Schemas['QuoteRequest'];
export type Quote = Schemas['Quote'];
export type QuoteLine = Schemas['QuoteLine'];
export type ValidationProblem = Schemas['ValidationProblemDetails'];

// What the form holds while someone is typing: every answer as text,
// converted to a QuoteRequest only once the step is valid.
export type Answers = Record<keyof QuoteRequest, string>;
