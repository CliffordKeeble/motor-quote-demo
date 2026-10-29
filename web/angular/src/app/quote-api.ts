import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Quote, QuoteRequest, ValidationProblem, Vehicle } from '@shared/types';

// What came back from POST /api/quote. A quote, or the server refusing some answers (400,
// with a message for each), or anything else going wrong: no connection, a 5xx, a reply we
// can't read. The caller keeps every answer in all three cases.
export type QuoteOutcome =
  | { kind: 'quote'; quote: Quote }
  | { kind: 'refused'; errors: Record<string, string[]> }
  | { kind: 'failed' };

// The same two calls as the React app's api/quoteApi.ts, through Angular's HttpClient.
@Injectable({ providedIn: 'root' })
export class QuoteApi {
  private readonly http = inject(HttpClient);

  async getQuote(request: QuoteRequest): Promise<QuoteOutcome> {
    try {
      const quote = await firstValueFrom(
        this.http.post<Quote>('/api/quote', request, {
          headers: { Accept: 'application/json, application/problem+json' },
        }),
      );
      return { kind: 'quote', quote };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        const problem = error.error as Partial<ValidationProblem> | null;
        if (problem && typeof problem === 'object' && problem.errors) return { kind: 'refused', errors: problem.errors };
      }
      return { kind: 'failed' };
    }
  }

  // The sample cars, or null if they could not be fetched.
  async getVehicles(): Promise<Vehicle[] | null> {
    try {
      return await firstValueFrom(this.http.get<Vehicle[]>('/api/vehicles', { headers: { Accept: 'application/json' } }));
    } catch {
      return null;
    }
  }
}
