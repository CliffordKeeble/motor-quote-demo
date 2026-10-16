import type { Quote, QuoteRequest, ValidationProblem, Vehicle } from '../types';

// What came back from POST /api/quote. A quote, or the server refusing some answers (400,
// with a message for each), or anything else going wrong: no connection, a 5xx, a reply we
// can't read. The caller keeps every answer in all three cases.
export type QuoteOutcome =
  | { kind: 'quote'; quote: Quote }
  | { kind: 'refused'; errors: Record<string, string[]> }
  | { kind: 'failed' };

export async function getQuote(request: QuoteRequest): Promise<QuoteOutcome> {
  try {
    const response = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
      body: JSON.stringify(request),
    });
    if (response.ok) return { kind: 'quote', quote: (await response.json()) as Quote };
    if (response.status === 400) {
      const problem = (await response.json()) as Partial<ValidationProblem>;
      if (problem.errors) return { kind: 'refused', errors: problem.errors };
    }
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

// The six sample cars, or null if they could not be fetched.
export async function getVehicles(): Promise<Vehicle[] | null> {
  try {
    const response = await fetch('/api/vehicles', { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return (await response.json()) as Vehicle[];
  } catch {
    return null;
  }
}
