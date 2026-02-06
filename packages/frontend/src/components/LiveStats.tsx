import React from 'react';
import { usePortfolioAnalysis } from '../hooks/useSimulation';
import { useUIStore } from '../store/uiStore';
import { formatCurrency, formatNumber } from '../utils/formatting';

export const LiveStats: React.FC = () => {
  const { walletAddress, funderAddress } = useUIStore();
  const { data: portfolio, isLoading } = usePortfolioAnalysis(walletAddress, funderAddress);

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Portfolio Stats</h2>
        <p className="text-gray-500 dark:text-gray-400">Connect wallet to view stats</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Portfolio Stats</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">Portfolio Stats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Daily Rewards</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(portfolio.totalRewards)}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Capital at Risk</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(portfolio.totalCapital)}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Markets</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {portfolio.marketCount}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Best Market</p>
          {portfolio.bestMarket ? (
            <div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(portfolio.bestMarket.dailyReward)}/day
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {portfolio.bestMarket.question.slice(0, 30)}...
              </p>
            </div>
          ) : (
            <p className="text-gray-400">N/A</p>
          )}
        </div>
      </div>
      
      {portfolio.worstMarket && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Worst Performing Market</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(portfolio.worstMarket.dailyReward)}/day
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {portfolio.worstMarket.question}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
