import axios, { AxiosInstance } from 'axios';
import { D, ZERO } from '../utils/decimal';
import { marketCache, orderBookCache } from '../utils/cache';
import {
  Market,
  OrderBook,
  OrderBookLevel,
  ApiMarket,
  ApiOrderBook,
} from '../types';

export class PolymarketAPI {
  private client: AxiosInstance;
  private baseURL: string = 'https://clob.polymarket.com';
  private gammaURL: string = 'https://gamma-api.polymarket.com';
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async retry<T>(fn: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.response?.status === 429 || error.code === 'ECONNRESET')) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(fn, retries - 1);
      }
      throw error;
    }
  }

  async fetchMarkets(): Promise<Market[]> {
    const cached = marketCache.get('all_markets');
    if (cached) return cached as Market[];

    try {
      const response = await this.retry(() =>
        this.client.get<ApiMarket[]>(`${this.gammaURL}/markets`, {
          params: {
            active: true,
            closed: false,
            limit: 100,
          },
        })
      );

      const markets: Market[] = [];

      for (const apiMarket of response.data) {
        if (!apiMarket.rewards || !apiMarket.enable_order_book) continue;

        const yesPrice = apiMarket.outcome_prices?.[0]
          ? D(apiMarket.outcome_prices[0])
          : D(0.5);
        const noPrice = apiMarket.outcome_prices?.[1]
          ? D(apiMarket.outcome_prices[1])
          : D(0.5);

        const currentRate = apiMarket.rewards.rates[0];
        const rewardPoolPerDay = D(currentRate?.rewards_daily_rate || 0);
        const maxRewardSpread = D(apiMarket.rewards.max_spread);
        const minSizeRequirement = D(apiMarket.rewards.min_size);

        markets.push({
          id: apiMarket.condition_id,
          question: apiMarket.question,
          yesPrice,
          noPrice,
          rewardPoolPerDay,
          maxRewardSpread,
          minSizeRequirement,
          lastUpdated: Date.now(),
          volume: apiMarket.volume ? D(apiMarket.volume) : undefined,
          liquidity: apiMarket.liquidity ? D(apiMarket.liquidity) : undefined,
        });
      }

      marketCache.set('all_markets', markets);
      return markets;
    } catch (error: any) {
      console.error('Error fetching markets:', error.message);
      return [];
    }
  }

  async fetchMarketById(marketId: string): Promise<Market | null> {
    const markets = await this.fetchMarkets();
    return markets.find(m => m.id === marketId) || null;
  }

  async fetchOrderBook(marketId: string, side: 'YES' | 'NO' = 'YES'): Promise<OrderBook | null> {
    const cacheKey = `orderbook_${marketId}_${side}`;
    const cached = orderBookCache.get(cacheKey);
    if (cached) return cached as OrderBook;

    try {
      const market = await this.fetchMarketById(marketId);
      if (!market) return null;

      const tokenId = side === 'YES' ? '0' : '1';

      const response = await this.retry(() =>
        this.client.get<ApiOrderBook>(`${this.baseURL}/book`, {
          params: {
            token_id: `${marketId}-${tokenId}`,
          },
        })
      );

      const data = response.data;

      const bidLevels: OrderBookLevel[] = data.bids
        .map(b => ({
          price: D(b.price),
          size: D(b.size),
        }))
        .sort((a, b) => b.price.comparedTo(a.price));

      const askLevels: OrderBookLevel[] = data.asks
        .map(a => ({
          price: D(a.price),
          size: D(a.size),
        }))
        .sort((a, b) => a.price.comparedTo(b.price));

      const bestBid = bidLevels.length > 0 ? bidLevels[0].price : ZERO;
      const bestAsk = askLevels.length > 0 ? askLevels[0].price : D(1);

      const orderBook: OrderBook = {
        marketId,
        bestBid,
        bestAsk,
        bidLevels,
        askLevels,
        timestamp: Date.now(),
      };

      orderBookCache.set(cacheKey, orderBook);
      return orderBook;
    } catch (error: any) {
      console.error(`Error fetching order book for ${marketId}:`, error.message);
      return null;
    }
  }

  async fetchMultipleOrderBooks(marketIds: string[]): Promise<Map<string, OrderBook>> {
    const results = new Map<string, OrderBook>();
    
    for (const marketId of marketIds) {
      const orderBook = await this.fetchOrderBook(marketId);
      if (orderBook) {
        results.set(marketId, orderBook);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

export const polymarketAPI = new PolymarketAPI();
