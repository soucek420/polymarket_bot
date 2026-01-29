import Decimal from 'decimal.js';
import { D, ZERO, sum } from '../utils/decimal';
import { Market, UserOrder, MarketRanking, OrderBook } from '../types';
import { calculateQ1, calculateQ2, applyTwoSidedRule } from '../engine/qCalculator';
import {
  calculateMidpoint,
  estimateDailyReward,
  calculateUserShare,
  calculateCapitalAtRisk,
  calculateRewardPerDollar,
  calculateRewardPerShares,
} from '../engine/rewardMath';
import { estimateOtherMakersQmin, estimateTotalQmin } from '../engine/competitionEstimator';

export const calculateMarketReward = (
  userOrders: UserOrder[],
  market: Market,
  orderBook: OrderBook
): {
  dailyReward: Decimal;
  capitalAtRisk: Decimal;
  userQmin: Decimal;
} => {
  const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
  const v = market.maxRewardSpread;
  
  const marketOrders = userOrders.filter(order => order.marketId === market.id);
  
  if (marketOrders.length === 0) {
    return {
      dailyReward: ZERO,
      capitalAtRisk: ZERO,
      userQmin: ZERO,
    };
  }
  
  const Q1 = calculateQ1(marketOrders, midpoint, v);
  const Q2 = calculateQ2(marketOrders, midpoint, v);
  const userQmin = applyTwoSidedRule(Q1, Q2, midpoint);
  
  const competitionQmin = estimateOtherMakersQmin(orderBook, v, midpoint);
  const totalQmin = estimateTotalQmin(userQmin, competitionQmin);
  
  const userShare = calculateUserShare(userQmin, totalQmin);
  const dailyReward = estimateDailyReward(userShare, market.rewardPoolPerDay);
  
  const capitalAtRisk = sum(
    marketOrders.map(order => calculateCapitalAtRisk(order.price, order.size, order.side))
  );
  
  return { dailyReward, capitalAtRisk, userQmin };
};

export const rankMarketsByEfficiency = (
  userOrders: UserOrder[],
  markets: Market[],
  orderBooks: Map<string, OrderBook>
): MarketRanking[] => {
  const rankings: MarketRanking[] = [];
  
  for (const market of markets) {
    const orderBook = orderBooks.get(market.id);
    if (!orderBook) continue;
    
    const { dailyReward, capitalAtRisk, userQmin } = calculateMarketReward(
      userOrders,
      market,
      orderBook
    );
    
    if (userQmin.equals(ZERO)) continue;
    
    const rewardPerDollarAtRisk = calculateRewardPerDollar(dailyReward, capitalAtRisk);
    
    const totalSize = sum(
      userOrders
        .filter(order => order.marketId === market.id)
        .map(order => order.size)
    );
    
    const rewardPer100Shares = calculateRewardPerShares(dailyReward, totalSize, D(100));
    
    const efficiencyScore = rewardPerDollarAtRisk.times(100).toNumber();
    
    rankings.push({
      marketId: market.id,
      question: market.question,
      dailyReward,
      capitalAtRisk,
      rewardPerDollarAtRisk,
      rewardPer100Shares,
      efficiencyScore,
      rank: 0,
    });
  }
  
  rankings.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });
  
  return rankings;
};

export const findBestMarket = (rankings: MarketRanking[]): MarketRanking | null => {
  if (rankings.length === 0) return null;
  return rankings[0];
};

export const findWorstMarket = (rankings: MarketRanking[]): MarketRanking | null => {
  if (rankings.length === 0) return null;
  return rankings[rankings.length - 1];
};

export const calculateTotalRewards = (rankings: MarketRanking[]): Decimal => {
  return sum(rankings.map(r => r.dailyReward));
};

export const calculateTotalCapital = (rankings: MarketRanking[]): Decimal => {
  return sum(rankings.map(r => r.capitalAtRisk));
};

export const analyzePortfolio = (
  userOrders: UserOrder[],
  markets: Market[],
  orderBooks: Map<string, OrderBook>
) => {
  const rankings = rankMarketsByEfficiency(userOrders, markets, orderBooks);
  
  return {
    rankings,
    totalRewards: calculateTotalRewards(rankings),
    totalCapital: calculateTotalCapital(rankings),
    bestMarket: findBestMarket(rankings),
    worstMarket: findWorstMarket(rankings),
    marketCount: rankings.length,
  };
};
