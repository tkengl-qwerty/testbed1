export interface CurrencyPair {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  priority: 'featured' | 'major';
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  marketTime?: number;
  lastUpdated: string;
}

export interface ChartPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartData {
  symbol: string;
  meta: any;
  range: string;
  interval: string;
  points: ChartPoint[];
  lastUpdated: string;
}

export type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  createdPrice: number;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
}

export interface GitHubRepoConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  workflowFileName: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  html_url: string;
}

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  default_branch: string;
  has_pages: boolean;
  pages_url?: string;
  permissions?: {
    push: boolean;
    admin: boolean;
  };
}
