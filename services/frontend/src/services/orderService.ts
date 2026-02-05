import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  Address,
} from '@/types';

const orderService = {
  async getOrders(
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Order>> {
    const response = await api.get<PaginatedResponse<Order>>('/orders', {
      params: { page, limit },
    });
    return response.data;
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return response.data.data;
  },

  async createOrder(data: {
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: Address;
    paymentMethod: string;
    couponCode?: string;
  }): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>('/orders', data);
    return response.data.data;
  },

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(
      `/orders/${orderId}/cancel`,
      { reason }
    );
    return response.data.data;
  },

  async trackOrder(
    orderId: string
  ): Promise<{
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    updates: Array<{ status: string; message: string; timestamp: string }>;
  }> {
    const response = await api.get<
      ApiResponse<{
        status: string;
        trackingNumber?: string;
        estimatedDelivery?: string;
        updates: Array<{ status: string; message: string; timestamp: string }>;
      }>
    >(`/orders/${orderId}/track`);
    return response.data.data;
  },

  async getAllOrders(
    page = 1,
    limit = 20,
    status?: string
  ): Promise<PaginatedResponse<Order>> {
    const response = await api.get<PaginatedResponse<Order>>('/admin/orders', {
      params: { page, limit, status },
    });
    return response.data;
  },

  async updateOrderStatus(
    orderId: string,
    status: string
  ): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(
      `/admin/orders/${orderId}/status`,
      { status }
    );
    return response.data.data;
  },
};

export default orderService;
