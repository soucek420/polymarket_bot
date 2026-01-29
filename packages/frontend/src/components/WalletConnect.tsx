import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { formatWalletAddress } from '../utils/formatting';

export const WalletConnect: React.FC = () => {
  const { walletAddress, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  return (
    <div className="flex items-center space-x-4">
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      {!isConnected ? (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-mono text-sm">{formatWalletAddress(walletAddress!)}</span>
          </div>
          <button
            onClick={disconnect}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
