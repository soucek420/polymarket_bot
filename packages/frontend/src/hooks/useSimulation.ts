import { useQuery, useMutation } from '@tanstack/react-query';
import { simulatorAPI } from '../utils/api';
import { useState, useEffect } from 'react';

export interface SimulationResult {
  oldReward: string;
  newReward: string;
  rewardDelta: string;
  percentChange: string;
  oldQmin: string;
  newQmin: string;
  oldDistance: string;
  newDistance: string;
  oldScore: string;
  newScore: string;
  message: string;
}

export const useSimulation = (
  walletAddress: string | null,
  marketId: string | null,
  orderIndex: number | null,
  funderAddress?: string | null
) => {
  const [debouncedPrice, setDebouncedPrice] = useState<number | undefined>();
  const [debouncedSize, setDebouncedSize] = useState<number | undefined>();

  return useQuery({
    queryKey: ['simulation', walletAddress, funderAddress, marketId, orderIndex, debouncedPrice, debouncedSize],
    queryFn: async () => {
      if (!walletAddress || !marketId || orderIndex === null) return null;
      const response = await simulatorAPI.move(
        walletAddress,
        marketId,
        orderIndex,
        debouncedPrice,
        debouncedSize,
        funderAddress
      );
      return response.data.data as SimulationResult;
    },
    enabled: !!walletAddress && !!marketId && orderIndex !== null,
  });
};

export const useMarketComparison = (walletAddress: string | null, funderAddress?: string | null) => {
  return useQuery({
    queryKey: ['marketComparison', walletAddress, funderAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await simulatorAPI.marketComparison(walletAddress, funderAddress);
      return response.data.data;
    },
    enabled: !!walletAddress,
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export interface PortfolioAnalysis {
  totalRewards: string;
  totalCapital: string;
  marketCount: number;
  bestMarket: {
    marketId: string;
    question: string;
    efficiencyScore: number;
    dailyReward: string;
  } | null;
  worstMarket: {
    marketId: string;
    question: string;
    efficiencyScore: number;
    dailyReward: string;
  } | null;
  rankings: any[];
}

export const usePortfolioAnalysis = (walletAddress: string | null, funderAddress?: string | null) => {
  return useQuery({
    queryKey: ['portfolio', walletAddress, funderAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const response = await simulatorAPI.portfolio(walletAddress, funderAddress);
      return response.data.data as PortfolioAnalysis;
    },
    enabled: !!walletAddress,
    refetchInterval: 30000,
    staleTime: 20000,
  });
};

export const useDebouncedSimulation = () => {
  const [price, setPrice] = useState<number | undefined>();
  const [size, setSize] = useState<number | undefined>();
  const [debouncedPrice, setDebouncedPrice] = useState<number | undefined>();
  const [debouncedSize, setDebouncedSize] = useState<number | undefined>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPrice(price);
      setDebouncedSize(size);
    }, 300);

    return () => clearTimeout(timer);
  }, [price, size]);

  return {
    price,
    size,
    setPrice,
    setSize,
    debouncedPrice,
    debouncedSize,
  };
};
