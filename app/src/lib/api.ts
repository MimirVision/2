import { API_URL } from './config';
import { countryFor } from './markets';
import { getUserId } from './purchases';
import type { Appraisal, Settings } from './types';

export type AnalyzeError = 'paywall' | 'daily_limit' | 'not_item' | 'network';

export class ScanError extends Error {
  constructor(public code: AnalyzeError) {
    super(code);
  }
}

/** Buyers on Finn read Norwegian, on Blocket Swedish etc., regardless of the app's UI language. */
export function listingLanguage(country: string): string {
  return { NO: 'nb', SE: 'sv', DK: 'da', DE: 'de' }[country] ?? 'en';
}

export async function analyzePhoto(base64: string, settings: Settings, notes?: string): Promise<Appraisal> {
  const country = countryFor(settings.country);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-user-id': await getUserId() },
      body: JSON.stringify({
        image: base64,
        language: listingLanguage(country.code),
        currency: settings.currency,
        country: country.code,
        marketplaces: settings.marketplaces.length ? settings.marketplaces.slice(0, 5) : country.marketplaces.slice(0, 2),
        notes: notes?.trim() || undefined,
      }),
    });
  } catch {
    throw new ScanError('network');
  }

  if (res.status === 402) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ScanError(body.error === 'daily_limit' ? 'daily_limit' : 'paywall');
  }
  if (res.status === 422) throw new ScanError('not_item');
  if (!res.ok) throw new ScanError('network');

  const { appraisal } = (await res.json()) as { appraisal: Appraisal };
  if (!appraisal.identified) throw new ScanError('not_item');
  return appraisal;
}
