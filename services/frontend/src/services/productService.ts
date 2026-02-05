import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductCategory,
  ProductFilters,
  Review,
} from '@/types';

const productService = {
  async getProducts(
    filters?: ProductFilters
  ): Promise<PaginatedResponse<Product>> {
    const response = await api.get<PaginatedResponse<Product>>('/products', {
      params: filters,
    });
    return response.data;
  },

  async getProduct(productId: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(
      `/products/${productId}`
    );
    return response.data.data;
  },

  async getFeatured(): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(
      '/products/featured'
    );
    return response.data.data;
  },

  async getCategories(): Promise<ProductCategory[]> {
    const response = await api.get<ApiResponse<ProductCategory[]>>(
      '/products/categories'
    );
    return response.data.data;
  },

  async searchProducts(query: string): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(
      '/products/search',
      { params: { q: query } }
    );
    return response.data.data;
  },

  async getReviews(
    productId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Review>> {
    const response = await api.get<PaginatedResponse<Review>>(
      `/products/${productId}/reviews`,
      { params: { page, limit } }
    );
    return response.data;
  },

  async addReview(
    productId: string,
    review: { rating: number; title: string; comment: string }
  ): Promise<Review> {
    const response = await api.post<ApiResponse<Review>>(
      `/products/${productId}/reviews`,
      review
    );
    return response.data.data;
  },

  async getRelatedProducts(productId: string): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(
      `/products/${productId}/related`
    );
    return response.data.data;
  },
};

export default productService;
