import { useQuery } from '@tanstack/react-query';
import { marketsAPI } from '../utils/api';

export interface Market {
  id: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  rewardPoolPerDay: string;
  maxRewardSpread: string;
  minSizeRequirement: string;
  lastUpdated: number;
  volume?: string;
  liquidity?: string;
}

export const useMarkets = () => {
  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const response = await marketsAPI.getAll();
      return response.data.data as Market[];
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
};

export const useMarket = (marketId: string | null) => {
  return useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      if (!marketId) return null;
      const response = await marketsAPI.getById(marketId);
      return response.data.data as Market;
    },
    enabled: !!marketId,
    refetchInterval: 10000,
    staleTime: 5000,
  });
};

export const useMarketStats = (marketId: string | null) => {
  return useQuery({
    queryKey: ['marketStats', marketId],
    queryFn: async () => {
      if (!marketId) return null;
      const response = await marketsAPI.getStats(marketId);
      return response.data.data;
    },
    enabled: !!marketId,
    refetchInterval: 10000,
  });
};
