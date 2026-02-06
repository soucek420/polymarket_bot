import React from 'react';
import axios from 'axios';
import { useMarkets } from '../hooks/useMarkets';
import { useUIStore } from '../store/uiStore';
import { formatCurrency, formatPercent, formatPrice } from '../utils/formatting';

export const MarketGrid: React.FC = () => {
  const { data: markets, isLoading, error, refetch, isFetching } = useMarkets();
  const { selectedMarketId, setSelectedMarketId } = useUIStore();

  const errorMessage = (() => {
    if (!error) return null;
    if (axios.isAxiosError(error)) {
      return error.response?.data?.error || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unable to load markets.';
  })();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Markets</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Markets</h2>
        <p className="text-red-500 font-medium">Error loading markets</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {errorMessage} Ensure the backend is running and reachable.
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4 inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isFetching ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Markets</h2>
        <p className="text-gray-500 dark:text-gray-400">No markets with rewards available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Markets with Rewards</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{markets.length} markets</span>
      </div>
      
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {markets.map(market => (
          <div
            key={market.id}
            onClick={() => setSelectedMarketId(market.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMarketId === market.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex-1 pr-4">
                {market.question}
              </h3>
              <div className="flex space-x-2">
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-medium">
                  YES {formatPrice(market.yesPrice)}
                </span>
                <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium">
                  NO {formatPrice(market.noPrice)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Daily Pool</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCurrency(market.rewardPoolPerDay)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Max Spread</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatPercent(market.maxRewardSpread)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Min Size</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatPrice(market.minSizeRequirement)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
