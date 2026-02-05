import api from './api';
import type {
  ApiResponse,
  AuthResponse,
  AuthCredentials,
  RegisterData,
  User,
} from '@/types';

const authService = {
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    const { token, refreshToken, user } = response.data.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    return response.data.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      {
        name: data.name,
        email: data.email,
        password: data.password,
      }
    );
    const { token, refreshToken } = response.data.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/auth/refresh',
      { refreshToken }
    );
    const { token, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', newRefreshToken);
    return response.data.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/profile');
    return response.data.data;
  },

  async updateProfile(
    data: Partial<Pick<User, 'name' | 'phone' | 'address' | 'avatar'>>
  ): Promise<User> {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data);
    return response.data.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
};

export default authService;
