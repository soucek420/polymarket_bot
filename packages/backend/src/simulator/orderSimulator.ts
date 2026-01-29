import Decimal from 'decimal.js';
import { D, ZERO, percentage } from '../utils/decimal';
import { UserOrder, SimulationResult, Market, OrderBook } from '../types';
import { calculateQ1, calculateQ2, applyTwoSidedRule } from '../engine/qCalculator';
import { calculateMidpoint, estimateDailyReward, calculateUserShare } from '../engine/rewardMath';
import { estimateOtherMakersQmin, estimateTotalQmin } from '../engine/competitionEstimator';
import { scoreOrder } from '../engine/scorer';

export const simulateOrderMove = (
  userOrders: UserOrder[],
  market: Market,
  orderBook: OrderBook,
  targetOrderIndex: number,
  newPrice: Decimal,
  newSize: Decimal
): SimulationResult => {
  const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
  const v = market.maxRewardSpread;
  
  const oldQ1 = calculateQ1(userOrders, midpoint, v);
  const oldQ2 = calculateQ2(userOrders, midpoint, v);
  const oldQmin = applyTwoSidedRule(oldQ1, oldQ2, midpoint);
  
  const competitionQmin = estimateOtherMakersQmin(orderBook, v, midpoint);
  const oldTotalQmin = estimateTotalQmin(oldQmin, competitionQmin);
  const oldUserShare = calculateUserShare(oldQmin, oldTotalQmin);
  const oldReward = estimateDailyReward(oldUserShare, market.rewardPoolPerDay);
  
  const newOrders = [...userOrders];
  newOrders[targetOrderIndex] = {
    ...newOrders[targetOrderIndex],
    price: newPrice,
    size: newSize,
  };
  
  const newQ1 = calculateQ1(newOrders, midpoint, v);
  const newQ2 = calculateQ2(newOrders, midpoint, v);
  const newQmin = applyTwoSidedRule(newQ1, newQ2, midpoint);
  
  const newTotalQmin = estimateTotalQmin(newQmin, competitionQmin);
  const newUserShare = calculateUserShare(newQmin, newTotalQmin);
  const newReward = estimateDailyReward(newUserShare, market.rewardPoolPerDay);
  
  const rewardDelta = newReward.minus(oldReward);
  const percentChange = oldReward.greaterThan(ZERO)
    ? percentage(rewardDelta, oldReward)
    : ZERO;
  
  const oldOrder = userOrders[targetOrderIndex];
  const oldDistance = oldOrder.price.minus(midpoint).abs();
  const newDistance = newPrice.minus(midpoint).abs();
  
  const oldScoreResult = scoreOrder(oldOrder, midpoint, v);
  const newScoreResult = scoreOrder(
    { ...oldOrder, price: newPrice, size: newSize },
    midpoint,
    v
  );
  
  let message = '';
  if (rewardDelta.greaterThan(ZERO)) {
    message = `Moving closer increases reward by $${rewardDelta.toFixed(2)}/day (+${percentChange.toFixed(1)}%)`;
  } else if (rewardDelta.lessThan(ZERO)) {
    message = `Moving away decreases reward by $${rewardDelta.abs().toFixed(2)}/day (${percentChange.toFixed(1)}%)`;
  } else {
    message = 'No change in reward';
  }
  
  return {
    oldReward,
    newReward,
    rewardDelta,
    percentChange,
    oldQmin,
    newQmin,
    oldDistance,
    newDistance,
    oldScore: oldScoreResult.score,
    newScore: newScoreResult.score,
    message,
  };
};

export const simulatePriceMove = (
  userOrders: UserOrder[],
  market: Market,
  orderBook: OrderBook,
  marketId: string,
  priceAdjustment: Decimal
): SimulationResult[] => {
  const results: SimulationResult[] = [];
  
  const marketOrders = userOrders.filter(order => order.marketId === marketId);
  
  for (let i = 0; i < marketOrders.length; i++) {
    const order = marketOrders[i];
    const newPrice = order.price.plus(priceAdjustment);
    
    if (newPrice.greaterThan(ZERO) && newPrice.lessThan(D(1))) {
      const result = simulateOrderMove(
        marketOrders,
        market,
        orderBook,
        i,
        newPrice,
        order.size
      );
      results.push(result);
    }
  }
  
  return results;
};

export const simulateSizeChange = (
  userOrders: UserOrder[],
  market: Market,
  orderBook: OrderBook,
  targetOrderIndex: number,
  sizeMultiplier: Decimal
): SimulationResult => {
  const order = userOrders[targetOrderIndex];
  const newSize = order.size.times(sizeMultiplier);
  
  return simulateOrderMove(
    userOrders,
    market,
    orderBook,
    targetOrderIndex,
    order.price,
    newSize
  );
};
