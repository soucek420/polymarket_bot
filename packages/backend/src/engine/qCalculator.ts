import Decimal from 'decimal.js';
import { D, ZERO, max, min } from '../utils/decimal';
import { UserOrder, QCalculationResult, OrderBookLevel } from '../types';
import { scoreOrder } from './scorer';
import { isMidpointInMainBand } from './rewardMath';

export const calculateQ = (
  orders: UserOrder[],
  side: 'YES' | 'NO',
  midpoint: Decimal,
  v: Decimal
): Decimal => {
  let Q = ZERO;
  
  const sideOrders = orders.filter(order => order.side === side);
  
  for (const order of sideOrders) {
    const { score, qualifies } = scoreOrder(order, midpoint, v);
    
    if (qualifies) {
      Q = Q.plus(score.times(order.size));
    }
  }
  
  return Q;
};

export const calculateQ1 = (
  userOrders: UserOrder[],
  midpoint: Decimal,
  v: Decimal
): Decimal => {
  return calculateQ(userOrders, 'YES', midpoint, v);
};

export const calculateQ2 = (
  userOrders: UserOrder[],
  midpoint: Decimal,
  v: Decimal
): Decimal => {
  return calculateQ(userOrders, 'NO', midpoint, v);
};

export const applyTwoSidedRule = (
  Q1: Decimal,
  Q2: Decimal,
  midpoint: Decimal
): Decimal => {
  if (isMidpointInMainBand(midpoint)) {
    const minQ = min(Q1, Q2);
    const maxQ = max(Q1.dividedBy(3), Q2.dividedBy(3));
    return max(minQ, maxQ);
  } else {
    return min(Q1, Q2);
  }
};

export const calculateQFromOrderBook = (
  levels: OrderBookLevel[],
  side: 'YES' | 'NO',
  midpoint: Decimal,
  v: Decimal
): Decimal => {
  let Q = ZERO;
  
  for (const level of levels) {
    const distance = level.price.minus(midpoint).abs();
    
    if (distance.lessThanOrEqualTo(v)) {
      const numerator = v.minus(distance);
      const ratio = numerator.dividedBy(v);
      const score = ratio.pow(2);
      
      Q = Q.plus(score.times(level.size));
    }
  }
  
  return Q;
};

export const calculateDetailedQ = (
  orders: UserOrder[],
  side: 'YES' | 'NO',
  midpoint: Decimal,
  v: Decimal
): QCalculationResult => {
  let Q = ZERO;
  let orderCount = 0;
  let totalSize = ZERO;
  
  const sideOrders = orders.filter(order => order.side === side);
  
  for (const order of sideOrders) {
    const { score, qualifies } = scoreOrder(order, midpoint, v);
    
    if (qualifies) {
      Q = Q.plus(score.times(order.size));
      orderCount++;
      totalSize = totalSize.plus(order.size);
    }
  }
  
  return { Q, orderCount, totalSize };
};

export const estimateTotalQ = (
  userQ: Decimal,
  competitionQ: Decimal
): Decimal => {
  return userQ.plus(competitionQ);
};
