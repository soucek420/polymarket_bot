import Decimal from 'decimal.js';
import { ZERO } from '../utils/decimal';
import { OrderBook, CompetitionEstimate } from '../types';
import { calculateQFromOrderBook } from './qCalculator';
import { applyTwoSidedRule } from './qCalculator';

export const estimateOtherMakersQmin = (
  orderBook: OrderBook,
  v: Decimal,
  midpoint: Decimal
): Decimal => {
  const Q1_competition = calculateQFromOrderBook(
    orderBook.bidLevels,
    'YES',
    midpoint,
    v
  );
  
  const Q2_competition = calculateQFromOrderBook(
    orderBook.askLevels,
    'NO',
    midpoint,
    v
  );
  
  return applyTwoSidedRule(Q1_competition, Q2_competition, midpoint);
};

export const estimateTotalQmin = (
  userQmin: Decimal,
  competitionQmin: Decimal
): Decimal => {
  return userQmin.plus(competitionQmin);
};

export const analyzeCompetition = (
  orderBook: OrderBook,
  v: Decimal,
  midpoint: Decimal
): CompetitionEstimate => {
  const Q1_competition = calculateQFromOrderBook(
    orderBook.bidLevels,
    'YES',
    midpoint,
    v
  );
  
  const Q2_competition = calculateQFromOrderBook(
    orderBook.askLevels,
    'NO',
    midpoint,
    v
  );
  
  const estimatedQmin = applyTwoSidedRule(Q1_competition, Q2_competition, midpoint);
  
  const yesOrders = orderBook.bidLevels.filter(level => {
    const distance = level.price.minus(midpoint).abs();
    return distance.lessThanOrEqualTo(v);
  }).length;
  
  const noOrders = orderBook.askLevels.filter(level => {
    const distance = level.price.minus(midpoint).abs();
    return distance.lessThanOrEqualTo(v);
  }).length;
  
  return {
    estimatedQmin,
    totalOrders: yesOrders + noOrders,
    yesOrders,
    noOrders,
  };
};

export const estimateMarketShare = (
  userQmin: Decimal,
  orderBook: OrderBook,
  v: Decimal,
  midpoint: Decimal
): Decimal => {
  const competitionQmin = estimateOtherMakersQmin(orderBook, v, midpoint);
  const totalQmin = estimateTotalQmin(userQmin, competitionQmin);
  
  if (totalQmin.equals(ZERO)) return ZERO;
  
  return userQmin.dividedBy(totalQmin);
};
