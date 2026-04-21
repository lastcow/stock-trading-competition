export type Market = 'A_SHARES' | 'US_STOCKS';
export type Category = 'PERSONAL' | 'TEAM';

export interface Participant {
  id: string;
  name: string;
  type: Category;
  market: Market;
  avatar?: string;
}

export interface CapitalRecord {
  id: string;
  participantId: string;
  month: number; // 4-9 (April to September)
  capital: number;
  change: number;
  changePercent: number;
  inputBy: string;
  inputAt: string; // ISO date string
}

export interface Ranking {
  participantId: string;
  participantName: string;
  totalReturn: number;
  finalCapital: number;
  rank: number;
  monthlyRanks: number[];
  bestMonth: number;
  worstMonth: number;
}

export interface CompetitionConfig {
  name: string;
  startDate: string;
  endDate: string;
  initialCapital: Record<Market, number>;
  markets: Market[];
  categories: Category[];
  months: number[];
}

export interface MonthlyRankingItem {
  participantId: string;
  participantName: string;
  rank: number;
  initialCapital: number;
  currentCapital: number;
  change: number;
  changePercent: number;
  totalReturn: number;
}

export const MONTH_LABELS: Record<number, string> = {
  4: '4月',
  5: '5月',
  6: '6月',
  7: '7月',
  8: '8月',
  9: '9月',
};

export const MARKET_LABELS: Record<Market, string> = {
  A_SHARES: 'A股',
  US_STOCKS: '美股',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  PERSONAL: '个人',
  TEAM: '团队',
};

export const MARKET_CATEGORY_COMBINATIONS: { market: Market; category: Category }[] = [
  { market: 'A_SHARES', category: 'PERSONAL' },
  { market: 'A_SHARES', category: 'TEAM' },
  { market: 'US_STOCKS', category: 'PERSONAL' },
  { market: 'US_STOCKS', category: 'TEAM' },
];

export const CHART_COLORS = [
  '#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#BE185D', '#4338CA', '#065F46', '#92400E',
  '#2563EB', '#CA8A04',
];
