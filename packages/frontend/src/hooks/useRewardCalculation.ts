import { useQuery } from '@tanstack/react-query';
import { rewardsAPI } from '../utils/api';

export interface RewardCalculation {
  marketId: string;
  midpoint: string;
  Q1: string;
  Q2: string;
  Qmin: string;
  userShare: string;
  estimatedDailyReward: string;
  rewardBandLower: string;
  rewardBandUpper: string;
  inBand: boolean;
  competitionQmin: string;
  totalQmin: string;
}

export const useRewardCalculation = (
  walletAddress: string | null,
  marketId: string | null,
  funderAddress?: string | null
) => {
  return useQuery({
    queryKey: ['rewardCalculation', walletAddress, funderAddress, marketId],
    queryFn: async () => {
      if (!walletAddress || !marketId) return null;
      const response = await rewardsAPI.calculate(walletAddress, marketId, funderAddress);
      return response.data.data as RewardCalculation;
    },
    enabled: !!walletAddress && !!marketId,
    refetchInterval: 10000,
    staleTime: 5000,
  });
};

export const useBatchRewards = (walletAddress: string | null, funderAddress?: string | null) => {
  return useQuery({
    queryKey: ['batchRewards', walletAddress, funderAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await rewardsAPI.batch(walletAddress, funderAddress);
      return response.data.data;
    },
    enabled: !!walletAddress,
    refetchInterval: 15000,
    staleTime: 10000,
  });
};
