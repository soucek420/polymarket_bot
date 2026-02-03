import Decimal from 'decimal.js';

export interface Market {
  id: string;
  question: string;
  yesPrice: Decimal;
  noPrice: Decimal;
  rewardPoolPerDay: Decimal;
  maxRewardSpread: Decimal;
  minSizeRequirement: Decimal;
  lastUpdated: number;
  volume?: Decimal;
  liquidity?: Decimal;
}

export interface OrderBookLevel {
  price: Decimal;
  size: Decimal;
}

export interface OrderBook {
  marketId: string;
  bestBid: Decimal;
  bestAsk: Decimal;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  timestamp: number;
}

export interface UserOrder {
  marketId: string;
  side: 'YES' | 'NO';
  orderType: 'BID' | 'ASK';
  price: Decimal;
  size: Decimal;
  orderId?: string;
}

export interface RewardCalculation {
  marketId: string;
  midpoint: Decimal;
  Q1: Decimal;
  Q2: Decimal;
  Qmin: Decimal;
  userShare: Decimal;
  estimatedDailyReward: Decimal;
  rewardBandLower: Decimal;
  rewardBandUpper: Decimal;
  inBand: boolean;
  competitionQmin?: Decimal;
  totalQmin?: Decimal;
}

export interface SimulationResult {
  oldReward: Decimal;
  newReward: Decimal;
  rewardDelta: Decimal;
  percentChange: Decimal;
  oldQmin: Decimal;
  newQmin: Decimal;
  oldDistance: Decimal;
  newDistance: Decimal;
  oldScore: Decimal;
  newScore: Decimal;
  message: string;
}

export interface MarketRanking {
  marketId: string;
  question: string;
  dailyReward: Decimal;
  capitalAtRisk: Decimal;
  rewardPerDollarAtRisk: Decimal;
  rewardPer100Shares: Decimal;
  efficiencyScore: number;
  rank: number;
}

export interface OrderScore {
  score: Decimal;
  distance: Decimal;
  qualifies: boolean;
}

export interface ApiMarket {
  condition_id: string;
  question: string;
  slug: string;
  end_date_iso: string;
  game_start_time?: string;
  description?: string;
  outcomes: string[];
  outcome_prices?: string[];
  volume?: string;
  liquidity?: string;
  enable_order_book?: boolean;
  active?: boolean;
  closed?: boolean;
  tags?: string[];
  rewards?: {
    max_spread: number;
    min_size: number;
    event_start_date: string;
    event_end_date: string;
    rates: Array<{
      start_date: string;
      end_date: string;
      rewards_daily_rate: number;
    }>;
  };
}

export interface ApiOrderBook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
}

export interface ApiUserOrder {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  size_matched: string;
  outcome: string;
  type: 'FOK' | 'GTC' | 'GTD';
  created_at: string;
  status: 'LIVE' | 'MATCHED' | 'CANCELLED';
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface WalletInfo {
  address: string;
  orders: UserOrder[];
  totalPositions: number;
  totalRewards: Decimal;
}

export interface RewardBandBounds {
  lower: Decimal;
  upper: Decimal;
}

export interface QCalculationResult {
  Q: Decimal;
  orderCount: number;
  totalSize: Decimal;
}

export interface CompetitionEstimate {
  estimatedQmin: Decimal;
  totalOrders: number;
  yesOrders: number;
  noOrders: number;
}
