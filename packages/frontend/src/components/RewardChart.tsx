import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { useOrderBook } from '../hooks/useOrderBook';
import { useMarket } from '../hooks/useMarkets';
import { useUIStore } from '../store/uiStore';
import Decimal from 'decimal.js';

export const RewardChart: React.FC = () => {
  const { selectedMarketId } = useUIStore();
  const { data: market } = useMarket(selectedMarketId);
  const { data: orderBook } = useOrderBook(selectedMarketId);

  if (!selectedMarketId || !market || !orderBook) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Score Curve</h2>
        <p className="text-gray-500 dark:text-gray-400">Select a market to view score curve</p>
      </div>
    );
  }

  const midpoint = new Decimal(orderBook.midpoint);
  const v = new Decimal(market.maxRewardSpread);
  
  const generateScoreCurve = () => {
    const data = [];
    const minPrice = Math.max(0, midpoint.minus(v.times(1.5)).toNumber());
    const maxPrice = Math.min(1, midpoint.plus(v.times(1.5)).toNumber());
    const step = (maxPrice - minPrice) / 100;
    
    for (let price = minPrice; price <= maxPrice; price += step) {
      const distance = new Decimal(price).minus(midpoint).abs();
      let score = 0;
      
      if (distance.lessThanOrEqualTo(v)) {
        const ratio = v.minus(distance).dividedBy(v);
        score = ratio.pow(2).toNumber();
      }
      
      data.push({
        price: price,
        score: score,
        distance: distance.toNumber(),
      });
    }
    
    return data;
  };

  const data = generateScoreCurve();
  const bandLower = midpoint.minus(v).toNumber();
  const bandUpper = midpoint.plus(v).toNumber();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Score vs Distance Curve</h2>
      
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>Midpoint:</strong> {midpoint.toFixed(4)} | 
          <strong className="ml-2">Reward Band:</strong> {bandLower.toFixed(4)} - {bandUpper.toFixed(4)}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="price" 
            label={{ value: 'Price', position: 'insideBottom', offset: -5 }}
            stroke="#9CA3AF"
            tickFormatter={(value) => value.toFixed(2)}
          />
          <YAxis 
            label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
            stroke="#9CA3AF"
            domain={[0, 1]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value: any) => value.toFixed(4)}
            labelFormatter={(label) => `Price: ${Number(label).toFixed(4)}`}
          />
          <Legend />
          
          <ReferenceLine 
            x={midpoint.toNumber()} 
            stroke="#EF4444" 
            strokeDasharray="3 3" 
            label={{ value: 'Midpoint', fill: '#EF4444' }} 
          />
          <ReferenceLine 
            x={bandLower} 
            stroke="#10B981" 
            strokeDasharray="3 3" 
            label={{ value: 'Band Lower', fill: '#10B981', position: 'insideBottomLeft' }} 
          />
          <ReferenceLine 
            x={bandUpper} 
            stroke="#10B981" 
            strokeDasharray="3 3" 
            label={{ value: 'Band Upper', fill: '#10B981', position: 'insideBottomRight' }} 
          />
          
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#3B82F6" 
            fill="url(#colorScore)" 
            strokeWidth={2}
            name="Order Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
