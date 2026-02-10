import axios from 'axios';
import { D } from '../utils/decimal';
import { userOrderCache } from '../utils/cache';
import { UserOrder, ApiUserOrder } from '../types';

export class WalletAPI {
  private baseURL: string = process.env.POLYMARKET_CLOB_BASE_URL || 'https://clob.polymarket.com';
  private readonly fallbackOrderEndpoints = (process.env.POLYMARKET_ORDER_ENDPOINTS || '/orders,/data/orders,/data/order')
    .split(',')
    .map(endpoint => endpoint.trim())
    .filter(Boolean)
    .map(endpoint => endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  private readonly lastFetchErrorByMaker = new Map<string, string | null>();

  private normalizeApiOrders(payload: unknown): ApiUserOrder[] {
    if (Array.isArray(payload)) {
      return payload as ApiUserOrder[];
    }

    const objectPayload = payload as Record<string, unknown> | null;
    if (!objectPayload) {
      return [];
    }

    const candidateKeys = ['data', 'orders', 'results'];
    for (const key of candidateKeys) {
      const value = objectPayload[key];
      if (Array.isArray(value)) {
        return value as ApiUserOrder[];
      }
    }

    return [];
  }

  private orderRequestParams(makerAddress: string): Array<Record<string, string>> {
    return [
      { maker: makerAddress, status: 'LIVE' },
      { owner: makerAddress, status: 'LIVE' },
      { address: makerAddress, status: 'LIVE' },
      { makerAddress, status: 'LIVE' },
    ];
  }

  private async requestUserOrders(makerAddress: string): Promise<ApiUserOrder[]> {
    const attempts: string[] = [];

    for (const endpoint of this.fallbackOrderEndpoints) {
      for (const params of this.orderRequestParams(makerAddress)) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            params,
            timeout: 10000,
          });

          return this.normalizeApiOrders(response.data);
        } catch (error: any) {
          const status = error?.response?.status;
          attempts.push(`GET ${endpoint}(${Object.keys(params)[0]}) -> ${status ?? 'network_error'}`);

          if (status && ![400, 401, 403, 404, 405].includes(status)) {
            throw error;
          }
        }

        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, params, {
            timeout: 10000,
          });

          return this.normalizeApiOrders(response.data);
        } catch (error: any) {
          const status = error?.response?.status;
          attempts.push(`POST ${endpoint}(${Object.keys(params)[0]}) -> ${status ?? 'network_error'}`);

          if (status && ![400, 401, 403, 404, 405].includes(status)) {
            throw error;
          }
        }
      }
    }

    throw new Error(`Unable to fetch orders from public endpoints. Attempts: ${attempts.join('; ')}`);
  }

  async fetchUserOrders(makerAddress: string): Promise<UserOrder[]> {
    const cacheKey = `user_orders_${makerAddress}`;
    const cached = userOrderCache.get(cacheKey);
    if (cached) return cached as UserOrder[];

    try {
      const apiOrders = await this.requestUserOrders(makerAddress);
      this.lastFetchErrorByMaker.set(makerAddress, null);
      const userOrders: UserOrder[] = apiOrders.map(order => {
        const side = order.outcome === 'YES' ? 'YES' : 'NO';
        const orderType = order.side === 'BUY' ? 'BID' : 'ASK';
        
        return {
          marketId: order.market,
          side,
          orderType,
          price: D(order.price),
          size: D(order.size).minus(D(order.size_matched)),
          orderId: order.id,
        };
      });

      userOrderCache.set(cacheKey, userOrders);
      return userOrders;
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      this.lastFetchErrorByMaker.set(makerAddress, message);
      console.error(`Error fetching user orders for ${makerAddress}:`, message);
      return [];
    }
  }

  getLastFetchError(makerAddress: string): string | null {
    return this.lastFetchErrorByMaker.get(makerAddress) ?? null;
  }

  async fetchOrdersByMarket(makerAddress: string, marketId: string): Promise<UserOrder[]> {
    const allOrders = await this.fetchUserOrders(makerAddress);
    return allOrders.filter(order => order.marketId === marketId);
  }

  clearCache(makerAddress?: string): void {
    if (makerAddress) {
      userOrderCache.delete(`user_orders_${makerAddress}`);
    } else {
      userOrderCache.clear();
    }
  }
}

export const walletAPI = new WalletAPI();
