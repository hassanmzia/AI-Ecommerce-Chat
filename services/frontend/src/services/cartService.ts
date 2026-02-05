import api from './api';
import type { ApiResponse, CartItem } from '@/types';

const cartService = {
  async getCart(): Promise<CartItem[]> {
    const response = await api.get<ApiResponse<CartItem[]>>('/cart');
    return response.data.data;
  },

  async addToCart(
    productId: string,
    quantity = 1
  ): Promise<CartItem> {
    const response = await api.post<ApiResponse<CartItem>>('/cart/items', {
      productId,
      quantity,
    });
    return response.data.data;
  },

  async updateQuantity(
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    const response = await api.put<ApiResponse<CartItem>>(
      `/cart/items/${itemId}`,
      { quantity }
    );
    return response.data.data;
  },

  async removeItem(itemId: string): Promise<void> {
    await api.delete(`/cart/items/${itemId}`);
  },

  async clearCart(): Promise<void> {
    await api.delete('/cart');
  },

  async applyCoupon(
    code: string
  ): Promise<{ discount: number; message: string }> {
    const response = await api.post<
      ApiResponse<{ discount: number; message: string }>
    >('/cart/coupon', { code });
    return response.data.data;
  },
};

export default cartService;
