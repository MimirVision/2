/** Mirrors server/src/schema.ts `Appraisal`. Keep the two in sync. */
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface Listing {
  marketplace: string;
  title: string;
  description: string;
  tags: string[];
}

export interface Appraisal {
  identified: boolean;
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  condition: Condition;
  conditionNotes: string;
  confidence: number;
  price: { low: number; typical: number; high: number; quickSale: number };
  demand: 'high' | 'medium' | 'low';
  daysToSell: number;
  priceReasoning: string;
  tips: string[];
  authenticityChecks: string[];
  searchQuery: string;
  listings: Listing[];
}

export type ItemStatus = 'inventory' | 'listed' | 'sold';

export interface Item {
  id: string;
  createdAt: number;
  imageUri: string;
  currency: string;
  appraisal: Appraisal;
  buyPrice: number | null;
  status: ItemStatus;
  soldPrice: number | null;
  soldAt: number | null;
}

export type Language = 'nb' | 'en';

export interface Settings {
  onboarded: boolean;
  language: Language;
  country: string;
  currency: string;
  marketplaces: string[];
  monthlyGoal: number | null;
  scansCompleted: number;
}
