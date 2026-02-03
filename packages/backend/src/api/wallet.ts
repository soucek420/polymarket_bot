import axios from 'axios';
import { D } from '../utils/decimal';
import { userOrderCache } from '../utils/cache';
import { UserOrder, ApiUserOrder } from '../types';

export class WalletAPI {
  private baseURL: string = 'https://clob.polymarket.com';

  async fetchUserOrders(walletAddress: string): Promise<UserOrder[]> {
    const cacheKey = `user_orders_${walletAddress}`;
    const cached = userOrderCache.get(cacheKey);
    if (cached) return cached as UserOrder[];

    try {
      const response = await axios.get<ApiUserOrder[]>(`${this.baseURL}/orders`, {
        params: {
          maker: walletAddress,
          status: 'LIVE',
        },
        timeout: 10000,
      });

      const userOrders: UserOrder[] = response.data.map(order => {
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
      console.error(`Error fetching user orders for ${walletAddress}:`, error.message);
      return [];
    }
  }

  async fetchOrdersByMarket(walletAddress: string, marketId: string): Promise<UserOrder[]> {
    const allOrders = await this.fetchUserOrders(walletAddress);
    return allOrders.filter(order => order.marketId === marketId);
  }

  clearCache(walletAddress?: string): void {
    if (walletAddress) {
      userOrderCache.delete(`user_orders_${walletAddress}`);
    } else {
      userOrderCache.clear();
    }
  }
}

export const walletAPI = new WalletAPI();
