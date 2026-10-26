import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/config', () => ({ API_URL: 'https://api.test' }));
vi.mock('@/lib/purchases', () => ({ getUserId: async () => '$RCAnonymousID:abc123abc123' }));

import { analyzePhoto, listingLanguage, ScanError } from '@/lib/api';
import { STRINGS, translate } from '@/lib/i18n';
import { COUNTRIES, MARKETPLACES, countryFor, defaultMarketplaces } from '@/lib/markets';
import { itemProfit, parseAmount, totals } from '@/lib/money';
import type { Appraisal, Item, Settings } from '@/lib/types';

const appraisal: Appraisal = {
  identified: true,
  title: 'Kånken',
  brand: 'Fjällräven',
  model: null,
  category: 'Bags',
  condition: 'good',
  conditionNotes: '',
  confidence: 0.8,
  price: { low: 300, typical: 400, high: 500, quickSale: 250 },
  demand: 'high',
  daysToSell: 4,
  priceReasoning: '',
  tips: [],
  authenticityChecks: [],
  searchQuery: 'kånken',
  listings: [],
};

const item = (patch: Partial<Item> = {}): Item => ({
  id: '1',
  createdAt: 0,
  imageUri: 'file://x.jpg',
  currency: 'NOK',
  appraisal,
  buyPrice: null,
  status: 'inventory',
  soldPrice: null,
  soldAt: null,
  ...patch,
});

const settings: Settings = {
  onboarded: true,
  language: 'nb',
  country: 'NO',
  currency: 'NOK',
  marketplaces: ['Finn.no', 'Tise'],
  monthlyGoal: null,
  scansCompleted: 0,
};

afterEach(() => vi.unstubAllGlobals());

describe('money', () => {
  it('uses the typical price until sold, then the sold price', () => {
    expect(itemProfit(item({ buyPrice: 100 }))).toBe(300);
    expect(itemProfit(item({ buyPrice: 100, status: 'sold', soldPrice: 450 }))).toBe(350);
  });

  it('sums unsold and sold items separately and skips unidentified ones', () => {
    const sum = totals([
      item({ buyPrice: 50 }),
      item({ status: 'sold', soldPrice: 600, buyPrice: 100 }),
      item({ appraisal: { ...appraisal, identified: false } }),
    ]);
    expect(sum).toEqual({
      unsoldCount: 1,
      unsoldValue: 400,
      soldCount: 1,
      soldRevenue: 600,
      realizedProfit: 500,
      potentialProfit: 350,
    });
  });

  it('parses user-typed amounts', () => {
    expect(parseAmount('1 250 kr')).toBe(1250);
    expect(parseAmount('99,5')).toBe(100);
    expect(parseAmount('')).toBeNull();
  });
});

describe('markets', () => {
  it('every country only references known marketplaces', () => {
    for (const c of COUNTRIES) for (const m of c.marketplaces) expect(MARKETPLACES[m], m).toBeDefined();
  });

  it('falls back to the US for unknown regions', () => {
    expect(countryFor('JP').code).toBe('US');
    expect(defaultMarketplaces('NO')).toEqual(['Finn.no', 'Tise']);
  });

  it('builds encoded search urls', () => {
    expect(MARKETPLACES['Finn.no'].searchUrl('sofa grå')).toBe(
      'https://www.finn.no/recommerce/forsale/search?q=sofa%20gr%C3%A5',
    );
  });
});

describe('i18n', () => {
  it('has every string in every language', () => {
    const keys = Object.keys(STRINGS.en).sort();
    expect(Object.keys(STRINGS.nb).sort()).toEqual(keys);
  });

  it('interpolates variables', () => {
    expect(translate('nb', 'item_days', { days: 3 })).toBe('~3 dager å selge');
  });
});

describe('api', () => {
  it('writes listings in the language buyers on the local marketplace read', () => {
    expect(listingLanguage('NO')).toBe('nb');
    expect(listingLanguage('SE')).toBe('sv');
    expect(listingLanguage('US')).toBe('en');
  });

  it('sends the right request and returns the appraisal', async () => {
    const fetchMock = vi.fn(async () => Response.json({ appraisal, pro: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzePhoto('b64', settings, '  str M ')).resolves.toEqual(appraisal);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/analyze');
    expect((init.headers as Record<string, string>)['x-app-user-id']).toBe('$RCAnonymousID:abc123abc123');
    expect(JSON.parse(init.body as string)).toEqual({
      image: 'b64',
      language: 'nb',
      currency: 'NOK',
      country: 'NO',
      marketplaces: ['Finn.no', 'Tise'],
      notes: 'str M',
    });
  });

  it.each([
    [402, { error: 'paywall' }, 'paywall'],
    [402, { error: 'daily_limit' }, 'daily_limit'],
    [422, { error: 'could_not_analyze' }, 'not_item'],
    [503, { error: 'try_again' }, 'network'],
    [200, { appraisal: { ...appraisal, identified: false } }, 'not_item'],
  ])('maps HTTP %i %j to %s', async (status, body, code) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status })));
    const err = await analyzePhoto('b64', settings).catch((e) => e);
    expect(err).toBeInstanceOf(ScanError);
    expect(err.code).toBe(code);
  });
});
