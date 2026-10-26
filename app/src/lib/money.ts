import type { Item } from './types';

export function formatMoney(amount: number, currency: string, locale = 'nb-NO'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

/** Profit if sold at the typical price (or the actual sold price once sold). */
export function itemProfit(item: Item): number {
  const revenue = item.status === 'sold' && item.soldPrice !== null ? item.soldPrice : item.appraisal.price.typical;
  return revenue - (item.buyPrice ?? 0);
}

export interface Totals {
  unsoldCount: number;
  unsoldValue: number;
  soldCount: number;
  soldRevenue: number;
  realizedProfit: number;
  potentialProfit: number;
}

export function totals(items: Item[]): Totals {
  const t: Totals = {
    unsoldCount: 0,
    unsoldValue: 0,
    soldCount: 0,
    soldRevenue: 0,
    realizedProfit: 0,
    potentialProfit: 0,
  };
  for (const item of items) {
    if (!item.appraisal.identified) continue;
    if (item.status === 'sold') {
      t.soldCount += 1;
      t.soldRevenue += item.soldPrice ?? 0;
      t.realizedProfit += itemProfit(item);
    } else {
      t.unsoldCount += 1;
      t.unsoldValue += item.appraisal.price.typical;
      t.potentialProfit += itemProfit(item);
    }
  }
  return t;
}

export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
