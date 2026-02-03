import { CachedData } from '../types';

export class Cache<T> {
  private cache: Map<string, CachedData<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 10000) {
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    this.cache.set(key, { data, timestamp: now, expiresAt });
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getAge(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    return Date.now() - cached.timestamp;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const marketCache = new Cache(10000);
export const orderBookCache = new Cache(5000);
export const userOrderCache = new Cache(15000);
