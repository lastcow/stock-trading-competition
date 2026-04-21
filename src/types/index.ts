export type Market = "A_SHARES" | "US_STOCKS";
export type Category = "PERSONAL" | "TEAM";

export interface Participant {
  id: number;
  name: string;
  type: Category;
  market: Market;
  avatar?: string;
  createdAt: Date;
}

export interface CapitalRecord {
  id: number;
  participantId: number;
  month: number;
  capital: string;
  change: string;
  changePercent: string;
  inputBy: string;
  inputAt: Date;
}

export interface CompetitionConfig {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  initialCapitalAshare: string;
  initialCapitalUs: string;
  updatedAt: Date;
}

export interface RankingItem {
  rank: number;
  participantId: number;
  participantName: string;
  initialCapital: number;
  currentCapital: number;
  change: number;
  changePercent: number;
  totalReturn: number;
  bestMonth: number;
  worstMonth: number;
  monthRecords: Array<{
    month: number;
    capital: number;
    change: number;
    changePercent: number;
  }>;
}

export const MONTH_LABELS: Record<number, string> = {
  4: "4月", 5: "5月", 6: "6月", 7: "7月", 8: "8月", 9: "9月",
};

export const MARKET_LABELS: Record<Market, string> = {
  A_SHARES: "A股",
  US_STOCKS: "美股",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  PERSONAL: "个人",
  TEAM: "团队",
};

export const MARKET_CATEGORY_COMBINATIONS: Array<{ market: Market; category: Category; label: string }> = [
  { market: "A_SHARES", category: "PERSONAL", label: "A股 · 个人" },
  { market: "A_SHARES", category: "TEAM", label: "A股 · 团队" },
  { market: "US_STOCKS", category: "PERSONAL", label: "美股 · 个人" },
  { market: "US_STOCKS", category: "TEAM", label: "美股 · 团队" },
];

export const MONTHS = [4, 5, 6, 7, 8, 9];
