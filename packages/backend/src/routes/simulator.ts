import { Router, Request, Response } from 'express';
import { D } from '../utils/decimal';
import { polymarketAPI } from '../api/polymarket';
import { walletAPI } from '../api/wallet';
import { simulateOrderMove, simulatePriceMove } from '../simulator/orderSimulator';
import { rankMarketsByEfficiency, analyzePortfolio } from '../simulator/marketSimulator';
import { UserOrder } from '../types';

const router = Router();

router.post('/move', async (req: Request, res: Response) => {
  try {
    const { walletAddress, marketId, orderIndex, newPrice, newSize } = req.body;
    
    if (!walletAddress || !marketId || orderIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, marketId, and orderIndex are required',
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
    
    const userOrders = await walletAPI.fetchOrdersByMarket(walletAddress, marketId);
    
    if (orderIndex >= userOrders.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order index',
      });
    }
    
    const order = userOrders[orderIndex];
    const priceToUse = newPrice !== undefined ? D(newPrice) : order.price;
    const sizeToUse = newSize !== undefined ? D(newSize) : order.size;
    
    const result = simulateOrderMove(
      userOrders,
      market,
      orderBook,
      orderIndex,
      priceToUse,
      sizeToUse
    );
    
    res.json({
      success: true,
      data: {
        oldReward: result.oldReward.toString(),
        newReward: result.newReward.toString(),
        rewardDelta: result.rewardDelta.toString(),
        percentChange: result.percentChange.toString(),
        oldQmin: result.oldQmin.toString(),
        newQmin: result.newQmin.toString(),
        oldDistance: result.oldDistance.toString(),
        newDistance: result.newDistance.toString(),
        oldScore: result.oldScore.toString(),
        newScore: result.newScore.toString(),
        message: result.message,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/price-adjustment', async (req: Request, res: Response) => {
  try {
    const { walletAddress, marketId, priceAdjustment } = req.body;
    
    if (!walletAddress || !marketId || priceAdjustment === undefined) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, marketId, and priceAdjustment are required',
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
    
    const userOrders = await walletAPI.fetchUserOrders(walletAddress);
    
    const results = simulatePriceMove(
      userOrders,
      market,
      orderBook,
      marketId,
      D(priceAdjustment)
    );
    
    res.json({
      success: true,
      data: results.map(result => ({
        oldReward: result.oldReward.toString(),
        newReward: result.newReward.toString(),
        rewardDelta: result.rewardDelta.toString(),
        percentChange: result.percentChange.toString(),
        message: result.message,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/market-comparison', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }
    
    const userOrders = await walletAPI.fetchUserOrders(walletAddress);
    const markets = await polymarketAPI.fetchMarkets();
    
    const marketIds = [...new Set(userOrders.map(order => order.marketId))];
    const orderBooks = await polymarketAPI.fetchMultipleOrderBooks(marketIds);
    
    const rankings = rankMarketsByEfficiency(userOrders, markets, orderBooks);
    
    res.json({
      success: true,
      data: rankings.map(ranking => ({
        marketId: ranking.marketId,
        question: ranking.question,
        dailyReward: ranking.dailyReward.toString(),
        capitalAtRisk: ranking.capitalAtRisk.toString(),
        rewardPerDollarAtRisk: ranking.rewardPerDollarAtRisk.toString(),
        rewardPer100Shares: ranking.rewardPer100Shares.toString(),
        efficiencyScore: ranking.efficiencyScore,
        rank: ranking.rank,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/portfolio', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }
    
    const userOrders = await walletAPI.fetchUserOrders(walletAddress);
    const markets = await polymarketAPI.fetchMarkets();
    
    const marketIds = [...new Set(userOrders.map(order => order.marketId))];
    const orderBooks = await polymarketAPI.fetchMultipleOrderBooks(marketIds);
    
    const portfolio = analyzePortfolio(userOrders, markets, orderBooks);
    
    res.json({
      success: true,
      data: {
        totalRewards: portfolio.totalRewards.toString(),
        totalCapital: portfolio.totalCapital.toString(),
        marketCount: portfolio.marketCount,
        bestMarket: portfolio.bestMarket ? {
          marketId: portfolio.bestMarket.marketId,
          question: portfolio.bestMarket.question,
          efficiencyScore: portfolio.bestMarket.efficiencyScore,
          dailyReward: portfolio.bestMarket.dailyReward.toString(),
        } : null,
        worstMarket: portfolio.worstMarket ? {
          marketId: portfolio.worstMarket.marketId,
          question: portfolio.worstMarket.question,
          efficiencyScore: portfolio.worstMarket.efficiencyScore,
          dailyReward: portfolio.worstMarket.dailyReward.toString(),
        } : null,
        rankings: portfolio.rankings.map(ranking => ({
          marketId: ranking.marketId,
          question: ranking.question,
          dailyReward: ranking.dailyReward.toString(),
          capitalAtRisk: ranking.capitalAtRisk.toString(),
          efficiencyScore: ranking.efficiencyScore,
          rank: ranking.rank,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
