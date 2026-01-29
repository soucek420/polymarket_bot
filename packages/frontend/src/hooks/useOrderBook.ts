import { useQuery } from '@tanstack/react-query';
import { marketsAPI } from '../utils/api';

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  marketId: string;
  bestBid: string;
  bestAsk: string;
  midpoint: string;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  timestamp: number;
  bandBounds: {
    lower: string;
    upper: string;
  } | null;
}

export const useOrderBook = (marketId: string | null, side: 'YES' | 'NO' = 'YES') => {
  return useQuery({
    queryKey: ['orderBook', marketId, side],
    queryFn: async () => {
      if (!marketId) return null;
      const response = await marketsAPI.getOrderBook(marketId, side);
      return response.data.data as OrderBook;
    },
    enabled: !!marketId,
    refetchInterval: 5000,
    staleTime: 3000,
  });
};
