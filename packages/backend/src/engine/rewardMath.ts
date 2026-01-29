import Decimal from 'decimal.js';
import { D, ZERO, ONE, max, min, divide, isZero } from '../utils/decimal';
import { RewardBandBounds } from '../types';

export const calculateMidpoint = (bestBid: Decimal, bestAsk: Decimal): Decimal => {
  return bestBid.plus(bestAsk).dividedBy(2);
};

export const isMidpointInMainBand = (midpoint: Decimal): boolean => {
  return midpoint.greaterThanOrEqualTo(D(0.1)) && midpoint.lessThanOrEqualTo(D(0.9));
};

export const calculateUserQmin = (Q1: Decimal, Q2: Decimal, midpoint: Decimal): Decimal => {
  if (isMidpointInMainBand(midpoint)) {
    const minQ = min(Q1, Q2);
    const maxQ = max(Q1.dividedBy(3), Q2.dividedBy(3));
    return max(minQ, maxQ);
  } else {
    return min(Q1, Q2);
  }
};

export const estimateCompetitionQmin = (
  competitionQ1: Decimal,
  competitionQ2: Decimal,
  midpoint: Decimal
): Decimal => {
  return calculateUserQmin(competitionQ1, competitionQ2, midpoint);
};

export const calculateUserShare = (userQmin: Decimal, totalQmin: Decimal): Decimal => {
  if (isZero(totalQmin)) return ZERO;
  return divide(userQmin, totalQmin);
};

export const estimateDailyReward = (userShare: Decimal, poolPerDay: Decimal): Decimal => {
  return userShare.times(poolPerDay);
};

export const getRewardBandBounds = (v: Decimal): RewardBandBounds => {
  const halfV = v.dividedBy(2);
  return {
    lower: D(0.5).minus(halfV),
    upper: D(0.5).plus(halfV),
  };
};

export const isPriceInBand = (price: Decimal, midpoint: Decimal, v: Decimal): boolean => {
  const distance = price.minus(midpoint).abs();
  return distance.lessThanOrEqualTo(v);
};

export const calculateDistance = (price: Decimal, midpoint: Decimal): Decimal => {
  return price.minus(midpoint).abs();
};

export const calculateCapitalAtRisk = (price: Decimal, size: Decimal, side: 'YES' | 'NO'): Decimal => {
  if (side === 'YES') {
    return price.times(size);
  } else {
    return ONE.minus(price).times(size);
  }
};

export const calculateRewardPerDollar = (dailyReward: Decimal, capitalAtRisk: Decimal): Decimal => {
  if (isZero(capitalAtRisk)) return ZERO;
  return divide(dailyReward, capitalAtRisk);
};

export const calculateRewardPerShares = (dailyReward: Decimal, size: Decimal, baseShares: Decimal = D(100)): Decimal => {
  if (isZero(size)) return ZERO;
  return dailyReward.times(baseShares).dividedBy(size);
};
