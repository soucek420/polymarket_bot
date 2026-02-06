import { Router, Request, Response } from 'express';
import { D } from '../utils/decimal';
import { polymarketAPI } from '../api/polymarket';
import { walletAPI } from '../api/wallet';
import { calculateQ1, calculateQ2, applyTwoSidedRule } from '../engine/qCalculator';
import {
  calculateMidpoint,
  estimateDailyReward,
  calculateUserShare,
  getRewardBandBounds,
  isMidpointInMainBand,
} from '../engine/rewardMath';
import { estimateOtherMakersQmin, estimateTotalQmin, analyzeCompetition } from '../engine/competitionEstimator';
import { UserOrder } from '../types';

const router = Router();

router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { walletAddress, funderAddress, marketId } = req.body;
    
    if (!walletAddress || !marketId) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress and marketId are required',
      });
    }

    const makerAddress = funderAddress || walletAddress;
    
    const market = await polymarketAPI.fetchMarketById(marketId);
    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }
    
    const orderBook = await polymarketAPI.fetchOrderBook(marketId);
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Order book not found',
      });
    }
    
    const userOrders = await walletAPI.fetchOrdersByMarket(makerAddress, marketId);
    
    const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
    const v = market.maxRewardSpread;
    
    const Q1 = calculateQ1(userOrders, midpoint, v);
    const Q2 = calculateQ2(userOrders, midpoint, v);
    const Qmin = applyTwoSidedRule(Q1, Q2, midpoint);
    
    const competitionQmin = estimateOtherMakersQmin(orderBook, v, midpoint);
    const totalQmin = estimateTotalQmin(Qmin, competitionQmin);
    
    const userShare = calculateUserShare(Qmin, totalQmin);
    const estimatedDailyReward = estimateDailyReward(userShare, market.rewardPoolPerDay);
    
    const bandBounds = getRewardBandBounds(midpoint, v);
    const inBand = isMidpointInMainBand(midpoint);
    
    res.json({
      success: true,
      data: {
        marketId: market.id,
        midpoint: midpoint.toString(),
        Q1: Q1.toString(),
        Q2: Q2.toString(),
        Qmin: Qmin.toString(),
        userShare: userShare.toString(),
        estimatedDailyReward: estimatedDailyReward.toString(),
        rewardBandLower: bandBounds.lower.toString(),
        rewardBandUpper: bandBounds.upper.toString(),
        inBand,
        competitionQmin: competitionQmin.toString(),
        totalQmin: totalQmin.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.body;
    
    if (!marketId) {
      return res.status(400).json({
        success: false,
        error: 'marketId is required',
      });
    }
    
    const market = await polymarketAPI.fetchMarketById(marketId);
    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }
    
    const orderBook = await polymarketAPI.fetchOrderBook(marketId);
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Order book not found',
      });
    }
    
    const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
    const v = market.maxRewardSpread;
    
    const competition = analyzeCompetition(orderBook, v, midpoint);
    
    res.json({
      success: true,
      data: {
        marketId: market.id,
        midpoint: midpoint.toString(),
        estimatedQmin: competition.estimatedQmin.toString(),
        totalOrders: competition.totalOrders,
        yesOrders: competition.yesOrders,
        noOrders: competition.noOrders,
        rewardPoolPerDay: market.rewardPoolPerDay.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { walletAddress, funderAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }

    const makerAddress = funderAddress || walletAddress;
    const userOrders = await walletAPI.fetchUserOrders(makerAddress);
    const marketIds = [...new Set(userOrders.map(order => order.marketId))];
    
    const results = [];
    
    for (const marketId of marketIds) {
      const market = await polymarketAPI.fetchMarketById(marketId);
      if (!market) continue;
      
      const orderBook = await polymarketAPI.fetchOrderBook(marketId);
      if (!orderBook) continue;
      
      const marketOrders = userOrders.filter(order => order.marketId === marketId);
      
      const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
      const v = market.maxRewardSpread;
      
      const Q1 = calculateQ1(marketOrders, midpoint, v);
      const Q2 = calculateQ2(marketOrders, midpoint, v);
      const Qmin = applyTwoSidedRule(Q1, Q2, midpoint);
      
      const competitionQmin = estimateOtherMakersQmin(orderBook, v, midpoint);
      const totalQmin = estimateTotalQmin(Qmin, competitionQmin);
      
      const userShare = calculateUserShare(Qmin, totalQmin);
      const estimatedDailyReward = estimateDailyReward(userShare, market.rewardPoolPerDay);
      
      results.push({
        marketId: market.id,
        question: market.question,
        estimatedDailyReward: estimatedDailyReward.toString(),
        userShare: userShare.toString(),
        Qmin: Qmin.toString(),
      });
    }
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
