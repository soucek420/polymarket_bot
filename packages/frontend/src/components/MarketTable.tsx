import React, { useState } from 'react';
import { useMarketComparison } from '../hooks/useSimulation';
import { useUIStore } from '../store/uiStore';
import { formatCurrency, formatNumber } from '../utils/formatting';

export const MarketTable: React.FC = () => {
  const { walletAddress, funderAddress, setSelectedMarketId } = useUIStore();
  const { data: comparison, isLoading } = useMarketComparison(walletAddress, funderAddress);
  const rankings = comparison?.data || [];
  const warning = comparison?.warning;
  const [sortBy, setSortBy] = useState<'efficiency' | 'reward' | 'capital'>('efficiency');

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Market Rankings</h2>
        <p className="text-gray-500 dark:text-gray-400">Connect wallet to view rankings</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Market Rankings</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Market Rankings</h2>
        <p className="text-gray-500 dark:text-gray-400">No positions found</p>
        {warning && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {warning.hint}
          </p>
        )}
      </div>
    );
  }

  const sortedRankings = [...rankings].sort((a, b) => {
    switch (sortBy) {
      case 'efficiency':
        return b.efficiencyScore - a.efficiencyScore;
      case 'reward':
        return parseFloat(b.dailyReward) - parseFloat(a.dailyReward);
      case 'capital':
        return parseFloat(b.capitalAtRisk) - parseFloat(a.capitalAtRisk);
      default:
        return 0;
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {warning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          {warning.hint}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Market Rankings</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setSortBy('efficiency')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'efficiency'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Efficiency
          </button>
          <button
            onClick={() => setSortBy('reward')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'reward'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Reward
          </button>
          <button
            onClick={() => setSortBy('capital')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'capital'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Capital
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Rank</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Market</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Reward</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Capital at Risk</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reward/$</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reward/100 Shares</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map((ranking, index) => (
              <tr 
                key={ranking.marketId}
                onClick={() => setSelectedMarketId(ranking.marketId)}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">
                  #{index + 1}
                </td>
                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200 max-w-md truncate">
                  {ranking.question}
                </td>
                <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(ranking.dailyReward)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-800 dark:text-gray-200">
                  {formatCurrency(ranking.capitalAtRisk)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-800 dark:text-gray-200">
                  {formatNumber(ranking.rewardPerDollarAtRisk, 4)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-800 dark:text-gray-200">
                  {formatCurrency(ranking.rewardPer100Shares)}
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <span className={`font-semibold ${
                    ranking.efficiencyScore > 0.1 ? 'text-green-600 dark:text-green-400' :
                    ranking.efficiencyScore > 0.05 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {formatNumber(ranking.efficiencyScore, 2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
