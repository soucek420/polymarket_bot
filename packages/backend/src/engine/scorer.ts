import Decimal from 'decimal.js';
import { D, ZERO, pow } from '../utils/decimal';
import { OrderScore, UserOrder } from '../types';

export const calculateOrderScore = (v: Decimal, s: Decimal): Decimal => {
  if (s.greaterThan(v)) return ZERO;
  
  const numerator = v.minus(s);
  const ratio = numerator.dividedBy(v);
  
  return pow(ratio, 2);
};

export const scoreOrder = (
  order: UserOrder,
  midpoint: Decimal,
  v: Decimal
): OrderScore => {
  const distance = order.price.minus(midpoint).abs();
  
  const qualifies = distance.lessThanOrEqualTo(v);
  
  const score = qualifies ? calculateOrderScore(v, distance) : ZERO;
  
  return {
    score,
    distance,
    qualifies,
  };
};

export const scoreOrders = (
  orders: UserOrder[],
  midpoint: Decimal,
  v: Decimal
) => {
  const scores = new Map<string, OrderScore>();
  
  for (const order of orders) {
    const key = `${order.marketId}_${order.side}_${order.orderType}_${order.price.toString()}`;
    scores.set(key, scoreOrder(order, midpoint, v));
  }
  
  return scores;
};

export const getQualifyingOrders = (
  orders: UserOrder[],
  midpoint: Decimal,
  v: Decimal
): UserOrder[] => {
  return orders.filter(order => {
    const distance = order.price.minus(midpoint).abs();
    return distance.lessThanOrEqualTo(v);
  });
};

export const calculateAverageScore = (scores: OrderScore[]): Decimal => {
  if (scores.length === 0) return ZERO;
  
  const totalScore = scores.reduce((sum, s) => sum.plus(s.score), ZERO);
  return totalScore.dividedBy(scores.length);
};
