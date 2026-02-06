import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useRewardCalculation } from '../hooks/useRewardCalculation';
import { useUIStore } from '../store/uiStore';
import { formatNumber, formatPercent } from '../utils/formatting';
import Decimal from 'decimal.js';

export const ComparisonChart: React.FC = () => {
  const { walletAddress, funderAddress, selectedMarketId } = useUIStore();
  const { data: reward, isLoading } = useRewardCalculation(walletAddress, selectedMarketId, funderAddress);

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Competition Analysis</h2>
        <p className="text-gray-500 dark:text-gray-400">Connect wallet to view competition</p>
      </div>
    );
  }

  if (!selectedMarketId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Competition Analysis</h2>
        <p className="text-gray-500 dark:text-gray-400">Select a market to view competition</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Competition Analysis</h2>
        <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!reward) {
    return null;
  }

  const userQmin = new Decimal(reward.Qmin).toNumber();
  const competitionQmin = new Decimal(reward.competitionQmin).toNumber();
  const totalQmin = new Decimal(reward.totalQmin).toNumber();
  const userShare = new Decimal(reward.userShare).toNumber();

  const data = [
    {
      name: 'Your Qmin',
      value: userQmin,
      fill: '#3B82F6',
    },
    {
      name: 'Competition Qmin',
      value: competitionQmin,
      fill: '#EF4444',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Competition Analysis</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Your Qmin</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(userQmin, 2)}
          </p>
        </div>
        
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Competition Qmin</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatNumber(competitionQmin, 2)}
          </p>
        </div>
      </div>
      
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">Your Market Share</p>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {formatPercent(userShare)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Based on estimated total Qmin: {formatNumber(totalQmin, 2)}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
          />
          <YAxis 
            stroke="#9CA3AF"
            label={{ value: 'Qmin Value', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value: any) => formatNumber(value, 4)}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
