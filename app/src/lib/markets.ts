export interface Marketplace {
  name: string;
  searchUrl: (query: string) => string;
}

const q = encodeURIComponent;

export const MARKETPLACES: Record<string, Marketplace> = {
  'Finn.no': { name: 'Finn.no', searchUrl: (s) => `https://www.finn.no/recommerce/forsale/search?q=${q(s)}` },
  Tise: { name: 'Tise', searchUrl: (s) => `https://tise.com/search?q=${q(s)}` },
  Blocket: { name: 'Blocket', searchUrl: (s) => `https://www.blocket.se/annonser/hela_sverige?q=${q(s)}` },
  Tradera: { name: 'Tradera', searchUrl: (s) => `https://www.tradera.com/search?q=${q(s)}` },
  DBA: { name: 'DBA', searchUrl: (s) => `https://www.dba.dk/soeg/?soeg=${q(s)}` },
  Vinted: { name: 'Vinted', searchUrl: (s) => `https://www.vinted.com/catalog?search_text=${q(s)}` },
  // Sold + completed listings: the best signal for what things actually sell for.
  eBay: { name: 'eBay', searchUrl: (s) => `https://www.ebay.com/sch/i.html?_nkw=${q(s)}&LH_Sold=1&LH_Complete=1` },
  'Facebook Marketplace': {
    name: 'Facebook Marketplace',
    searchUrl: (s) => `https://www.facebook.com/marketplace/search?query=${q(s)}`,
  },
  Depop: { name: 'Depop', searchUrl: (s) => `https://www.depop.com/search/?q=${q(s)}` },
};

export interface Country {
  code: string;
  currency: string;
  marketplaces: string[];
}

export const COUNTRIES: Country[] = [
  { code: 'NO', currency: 'NOK', marketplaces: ['Finn.no', 'Tise', 'Facebook Marketplace'] },
  { code: 'SE', currency: 'SEK', marketplaces: ['Blocket', 'Tradera', 'Vinted', 'Tise', 'Facebook Marketplace'] },
  { code: 'DK', currency: 'DKK', marketplaces: ['DBA', 'Vinted', 'Tise', 'Facebook Marketplace'] },
  { code: 'US', currency: 'USD', marketplaces: ['eBay', 'Facebook Marketplace', 'Depop'] },
  { code: 'GB', currency: 'GBP', marketplaces: ['eBay', 'Vinted', 'Depop', 'Facebook Marketplace'] },
  { code: 'DE', currency: 'EUR', marketplaces: ['Vinted', 'eBay', 'Facebook Marketplace'] },
];

export function countryFor(code: string | null | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES.find((c) => c.code === 'US')!;
}

/** Default selection: the two biggest marketplaces in the country. */
export function defaultMarketplaces(code: string): string[] {
  return countryFor(code).marketplaces.slice(0, 2);
}
