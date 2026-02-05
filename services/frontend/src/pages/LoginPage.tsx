import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import authService from '@/services/authService';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await authService.login({ email, password });
      login(response.user, response.accessToken, response.refreshToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-neutral-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Welcome Back</h1>
          <p className="text-neutral-500 mt-1">
            Sign in to your AI E-Commerce account
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-8">
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
