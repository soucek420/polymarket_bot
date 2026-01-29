import Decimal from 'decimal.js';

export const formatPrice = (price: string | number): string => {
  const p = new Decimal(price);
  return p.toFixed(4);
};

export const formatPercent = (value: string | number): string => {
  const v = new Decimal(value);
  return v.times(100).toFixed(2) + '%';
};

export const formatCurrency = (value: string | number): string => {
  const v = new Decimal(value);
  return '$' + v.toFixed(2);
};

export const formatNumber = (value: string | number, decimals: number = 2): string => {
  const v = new Decimal(value);
  return v.toFixed(decimals);
};

export const formatLargeNumber = (value: string | number): string => {
  const v = new Decimal(value);
  if (v.greaterThanOrEqualTo(1000000)) {
    return v.dividedBy(1000000).toFixed(2) + 'M';
  } else if (v.greaterThanOrEqualTo(1000)) {
    return v.dividedBy(1000).toFixed(2) + 'K';
  }
  return v.toFixed(2);
};

export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const parseDecimal = (value: string | number): Decimal => {
  return new Decimal(value);
};
