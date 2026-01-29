import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const marketsAPI = {
  getAll: () => api.get('/markets'),
  getById: (id: string) => api.get(`/markets/${id}`),
  getOrderBook: (id: string, side: 'YES' | 'NO' = 'YES') =>
    api.get(`/markets/${id}/orderbook`, { params: { side } }),
  getStats: (id: string) => api.get(`/markets/${id}/stats`),
};

export const rewardsAPI = {
  calculate: (walletAddress: string, marketId: string) =>
    api.post('/rewards/calculate', { walletAddress, marketId }),
  estimate: (marketId: string) =>
    api.post('/rewards/estimate', { marketId }),
  batch: (walletAddress: string) =>
    api.post('/rewards/batch', { walletAddress }),
};

export const simulatorAPI = {
  move: (walletAddress: string, marketId: string, orderIndex: number, newPrice?: number, newSize?: number) =>
    api.post('/simulator/move', { walletAddress, marketId, orderIndex, newPrice, newSize }),
  priceAdjustment: (walletAddress: string, marketId: string, priceAdjustment: number) =>
    api.post('/simulator/price-adjustment', { walletAddress, marketId, priceAdjustment }),
  marketComparison: (walletAddress: string) =>
    api.post('/simulator/market-comparison', { walletAddress }),
  portfolio: (walletAddress: string) =>
    api.post('/simulator/portfolio', { walletAddress }),
};
