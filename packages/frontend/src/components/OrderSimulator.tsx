import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useMarket } from '../hooks/useMarkets';
import { useOrderBook } from '../hooks/useOrderBook';
import { useRewardCalculation } from '../hooks/useRewardCalculation';
import { simulatorAPI } from '../utils/api';
import { formatCurrency, formatPrice, formatPercent } from '../utils/formatting';
import Decimal from 'decimal.js';

export const OrderSimulator: React.FC = () => {
  const { walletAddress, selectedMarketId, isSimulatorOpen, setIsSimulatorOpen } = useUIStore();
  const { data: market } = useMarket(selectedMarketId);
  const { data: orderBook } = useOrderBook(selectedMarketId);
  const { data: reward } = useRewardCalculation(walletAddress, selectedMarketId);
  
  const [orderIndex] = useState(0);
  const [simulatedPrice, setSimulatedPrice] = useState<string>('');
  const [simulatedSize, setSimulatedSize] = useState<string>('');
  const [simulation, setSimulation] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (orderBook && !simulatedPrice) {
      setSimulatedPrice(orderBook.midpoint);
    }
  }, [orderBook]);

  const runSimulation = async () => {
    if (!walletAddress || !selectedMarketId || !simulatedPrice) return;
    
    setIsSimulating(true);
    try {
      const response = await simulatorAPI.move(
        walletAddress,
        selectedMarketId,
        orderIndex,
        parseFloat(simulatedPrice),
        simulatedSize ? parseFloat(simulatedSize) : undefined
      );
      setSimulation(response.data.data);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (simulatedPrice && parseFloat(simulatedPrice) > 0) {
        runSimulation();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [simulatedPrice, simulatedSize, walletAddress, selectedMarketId]);

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Order Simulator</h2>
        <p className="text-gray-500 dark:text-gray-400">Connect wallet to simulate order moves</p>
      </div>
    );
  }

  if (!selectedMarketId || !market || !orderBook) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Order Simulator</h2>
        <p className="text-gray-500 dark:text-gray-400">Select a market to simulate order moves</p>
      </div>
    );
  }

  const midpoint = new Decimal(orderBook.midpoint);
  const maxSpread = new Decimal(market.maxRewardSpread);
  const bandLower = midpoint.minus(maxSpread);
  const bandUpper = midpoint.plus(maxSpread);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Order Simulator</h2>
        <button
          onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          {isSimulatorOpen ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {isSimulatorOpen && (
        <>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Midpoint</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{formatPrice(orderBook.midpoint)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Reward Band</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatPrice(bandLower.toString())} - {formatPrice(bandUpper.toString())}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Simulated Price
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="range"
                min={bandLower.toNumber()}
                max={bandUpper.toNumber()}
                step="0.001"
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(e.target.value)}
                className="w-full mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Simulated Size (optional)
              </label>
              <input
                type="number"
                step="10"
                min="0"
                value={simulatedSize}
                onChange={(e) => setSimulatedSize(e.target.value)}
                placeholder="Keep current size"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {simulation && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Impact</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {simulation.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Old Reward</p>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    {formatCurrency(simulation.oldReward)}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">New Reward</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(simulation.newReward)}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Change</p>
                  <p className={`text-xl font-bold ${
                    parseFloat(simulation.rewardDelta) > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {parseFloat(simulation.rewardDelta) > 0 ? '+' : ''}
                    {formatCurrency(simulation.rewardDelta)}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">% Change</p>
                  <p className={`text-xl font-bold ${
                    parseFloat(simulation.percentChange) > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {parseFloat(simulation.percentChange) > 0 ? '+' : ''}
                    {formatPercent(new Decimal(simulation.percentChange).dividedBy(100).toString())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Distance Change</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatPrice(simulation.oldDistance)} → {formatPrice(simulation.newDistance)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Score Change</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatPrice(simulation.oldScore)} → {formatPrice(simulation.newScore)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
