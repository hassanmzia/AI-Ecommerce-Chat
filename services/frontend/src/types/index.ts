// ========================
// User & Auth
// ========================
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'customer' | 'admin' | 'agent';
  phone?: string;
  address?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ========================
// Products
// ========================
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  images: string[];
  thumbnail?: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  brand?: string;
  tags: string[];
  specifications: Record<string, string>;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  productCount: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  search?: string;
  page?: number;
  limit?: number;
}

// ========================
// Orders
// ========================
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  payment: Payment;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Payment {
  id: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  amount: number;
  paidAt?: string;
}

// ========================
// Cart
// ========================
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  stock: number;
}

// ========================
// Wishlist
// ========================
export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

// ========================
// Chat & Messaging
// ========================
export interface Conversation {
  id: string;
  title: string;
  userId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
  isActive: boolean;
  agentType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

// ========================
// Coupons
// ========================
export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
}

// ========================
// Notifications
// ========================
export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'promotion' | 'system' | 'chat';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ========================
// Analytics
// ========================
export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  averageOrderValue: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// ========================
// Agent / AI
// ========================
export interface AgentStatus {
  id: string;
  name: string;
  type: 'order_management' | 'product_search' | 'customer_service' | 'payment' | 'analytics';
  status: 'online' | 'offline' | 'busy' | 'error';
  lastActive: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageResponseTime: number;
  successRate: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ========================
// API Response Types
// ========================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========================
// WebSocket Events
// ========================
export interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface WSChatMessage {
  type: 'chat_message';
  payload: {
    conversationId: string;
    message: Message;
  };
}

export interface WSTypingEvent {
  type: 'typing';
  payload: {
    conversationId: string;
    isTyping: boolean;
  };
}

export interface WSOrderUpdate {
  type: 'order_update';
  payload: {
    orderId: string;
    status: OrderStatus;
    message: string;
  };
}

export interface WSNotificationEvent {
  type: 'notification';
  payload: Notification;
}
