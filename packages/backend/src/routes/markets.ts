import { Router, Request, Response } from 'express';
import { polymarketAPI } from '../api/polymarket';
import { calculateMidpoint, getRewardBandBounds } from '../engine/rewardMath';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const markets = await polymarketAPI.fetchMarkets();
    
    const formattedMarkets = markets.map(market => ({
      id: market.id,
      question: market.question,
      yesPrice: market.yesPrice.toString(),
      noPrice: market.noPrice.toString(),
      rewardPoolPerDay: market.rewardPoolPerDay.toString(),
      maxRewardSpread: market.maxRewardSpread.toString(),
      minSizeRequirement: market.minSizeRequirement.toString(),
      lastUpdated: market.lastUpdated,
      volume: market.volume?.toString(),
      liquidity: market.liquidity?.toString(),
    }));
    
    res.json({
      success: true,
      data: formattedMarkets,
      count: formattedMarkets.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const market = await polymarketAPI.fetchMarketById(id);
    
    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        id: market.id,
        question: market.question,
        yesPrice: market.yesPrice.toString(),
        noPrice: market.noPrice.toString(),
        rewardPoolPerDay: market.rewardPoolPerDay.toString(),
        maxRewardSpread: market.maxRewardSpread.toString(),
        minSizeRequirement: market.minSizeRequirement.toString(),
        lastUpdated: market.lastUpdated,
        volume: market.volume?.toString(),
        liquidity: market.liquidity?.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/orderbook', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const side = (req.query.side as 'YES' | 'NO') || 'YES';
    
    const orderBook = await polymarketAPI.fetchOrderBook(id, side);
    
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Order book not found',
      });
    }
    
    const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
    const market = await polymarketAPI.fetchMarketById(id);
    const bandBounds = market ? getRewardBandBounds(midpoint, market.maxRewardSpread) : null;
    
    res.json({
      success: true,
      data: {
        marketId: orderBook.marketId,
        bestBid: orderBook.bestBid.toString(),
        bestAsk: orderBook.bestAsk.toString(),
        midpoint: midpoint.toString(),
        bidLevels: orderBook.bidLevels.map(level => ({
          price: level.price.toString(),
          size: level.size.toString(),
        })),
        askLevels: orderBook.askLevels.map(level => ({
          price: level.price.toString(),
          size: level.size.toString(),
        })),
        timestamp: orderBook.timestamp,
        bandBounds: bandBounds ? {
          lower: bandBounds.lower.toString(),
          upper: bandBounds.upper.toString(),
        } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const market = await polymarketAPI.fetchMarketById(id);
    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found',
      });
    }
    
    const orderBook = await polymarketAPI.fetchOrderBook(id);
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Order book not found',
      });
    }
    
    const midpoint = calculateMidpoint(orderBook.bestBid, orderBook.bestAsk);
    const bandBounds = getRewardBandBounds(midpoint, market.maxRewardSpread);
    
    res.json({
      success: true,
      data: {
        marketId: market.id,
        question: market.question,
        midpoint: midpoint.toString(),
        spread: orderBook.bestAsk.minus(orderBook.bestBid).toString(),
        rewardPoolPerDay: market.rewardPoolPerDay.toString(),
        maxRewardSpread: market.maxRewardSpread.toString(),
        bandBounds: {
          lower: bandBounds.lower.toString(),
          upper: bandBounds.upper.toString(),
        },
        bidDepth: orderBook.bidLevels.length,
        askDepth: orderBook.askLevels.length,
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
